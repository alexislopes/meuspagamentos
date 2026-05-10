import { describe, it, expect } from 'vitest'
import { ConfirmEntryUseCase } from './ConfirmEntry'
import { Entry } from '../../domain/entities/Entry'
import {
  EntryStatus,
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../../domain/value-objects/EntryStatus'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'

class FakeEntryRepo implements IEntryRepository {
  byId = new Map<string, Entry>()
  async getAll(ctx: ExpenseContext) {
    return Array.from(this.byId.values()).filter((e) => e.context === ctx)
  }
  async getById(id: string) { return this.byId.get(id) ?? null }
  async save(e: Entry) { this.byId.set(e.id, e) }
  async update(e: Entry) { this.byId.set(e.id, e) }
}

class FakeStatusRepo implements IEntryStatusRepository {
  calls: { entryId: string; status: EntryStatus; snapshot?: number }[] = []
  async getStatusesForMonth() { return new Map<string, EntryStatus>() }
  async getStatusesForMonths() { return new Map<string, Map<string, EntryStatus>>() }
  async getSnapshotsForMonth() { return new Map<string, number>() }
  async setStatus(_m: YearMonth, entryId: string, status: EntryStatus, snapshot?: number) {
    this.calls.push({ entryId, status, snapshot })
  }
  async removeStatus() {}
}

const month = YearMonth.of(2026, 6)

describe('ConfirmEntryUseCase', () => {
  it('confirms a fixed entry without snapshot', async () => {
    const er = new FakeEntryRepo()
    er.byId.set('fx', new Entry({
      id: 'fx', name: 'Aluguel', amount: Money.fromCents(100000),
      dueDay: 5, kind: 'expense', recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1), deletedFromMonth: null,
      context: ExpenseContext.PF, valueType: EntryValueType.FIXED,
    }))
    const sr = new FakeStatusRepo()
    await new ConfirmEntryUseCase(er, sr).execute(month, 'fx')
    expect(sr.calls[0]).toEqual({ entryId: 'fx', status: EntryStatus.CONFIRMED, snapshot: undefined })
  })

  it('confirms a relative entry with computed snapshot', async () => {
    const er = new FakeEntryRepo()
    er.byId.set('inc', new Entry({
      id: 'inc', name: 'Cliente A', amount: Money.fromCents(100000),
      dueDay: 5, kind: 'income', recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1), deletedFromMonth: null,
      context: ExpenseContext.PJ, valueType: EntryValueType.FIXED,
    }))
    er.byId.set('tax', new Entry({
      id: 'tax', name: 'Imposto', dueDay: 20, kind: 'expense',
      recurrence: 'monthly', createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null, context: ExpenseContext.PJ,
      valueType: EntryValueType.RELATIVE,
      formula: {
        terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
        percentage: 10,
      },
    }))
    const sr = new FakeStatusRepo()
    await new ConfirmEntryUseCase(er, sr).execute(month, 'tax')
    expect(sr.calls[0].snapshot).toBe(10000)
    expect(sr.calls[0].status).toBe(EntryStatus.CONFIRMED)
  })
})
