import { describe, it, expect } from 'vitest'
import { UpdateEntryUseCase } from './UpdateEntry'
import { Entry } from '../../domain/entities/Entry'
import {
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../../domain/value-objects/EntryStatus'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'

class FakeRepo implements IEntryRepository {
  byId = new Map<string, Entry>()
  async getAll() { return Array.from(this.byId.values()) }
  async getById(id: string) { return this.byId.get(id) ?? null }
  async save(e: Entry) { this.byId.set(e.id, e) }
  async update(e: Entry) { this.byId.set(e.id, e) }
}

describe('UpdateEntryUseCase', () => {
  it('updates fixed entry as a revision', async () => {
    const repo = new FakeRepo()
    const e = new Entry({
      id: 'fx', name: 'Aluguel', amount: Money.fromCents(150000),
      dueDay: 5, kind: 'expense', recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1), deletedFromMonth: null,
      context: ExpenseContext.PF, valueType: EntryValueType.FIXED,
    })
    repo.byId.set(e.id, e)
    const uc = new UpdateEntryUseCase(repo)
    await uc.execute({
      valueType: EntryValueType.FIXED,
      entryId: 'fx',
      name: 'Aluguel novo',
      amount: 1700,
      dueDay: 10,
      effectiveFromMonth: '2026-04',
    })
    const updated = repo.byId.get('fx')!
    expect(updated.revisions.length).toBe(1)
    expect(updated.revisions[0].valueType).toBe(EntryValueType.FIXED)
  })

  it('rejects changing valueType', async () => {
    const repo = new FakeRepo()
    const e = new Entry({
      id: 'fx', name: 'Aluguel', amount: Money.fromCents(150000),
      dueDay: 5, kind: 'expense', recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1), deletedFromMonth: null,
      context: ExpenseContext.PF, valueType: EntryValueType.FIXED,
    })
    repo.byId.set(e.id, e)
    const uc = new UpdateEntryUseCase(repo)
    await expect(
      uc.execute({
        valueType: EntryValueType.RELATIVE,
        entryId: 'fx',
        name: 'x',
        formula: {
          terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
          percentage: 10,
        },
        dueDay: 1,
        effectiveFromMonth: '2026-04',
      }),
    ).rejects.toThrow(/value/i)
  })
})
