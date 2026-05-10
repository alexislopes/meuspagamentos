import { describe, it, expect } from 'vitest'
import { GetMonthlySummaryUseCase } from './GetMonthlySummary'
import { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { EntryStatus, EntryValueType } from '../../domain/value-objects/EntryStatus'

class StubEntryRepo implements IEntryRepository {
  constructor(private entries: Entry[]) {}
  async getAll() { return this.entries }
  async getById(id: string) { return this.entries.find((e) => e.id === id) ?? null }
  async save() {}
  async update() {}
}

class StubStatusRepo implements IEntryStatusRepository {
  constructor(private statuses: Map<string, EntryStatus> = new Map()) {}
  async getStatusesForMonth() { return this.statuses }
  async getStatusesForMonths() { return new Map() }
  async getSnapshotsForMonth() { return new Map<string, number>() }
  async setStatus() {}
  async removeStatus() {}
}

const M = (y: number, m: number) => YearMonth.of(y, m)

function makeEntry(id: string, kind: 'income' | 'expense', cents: number, dueDay = 1): Entry {
  return new Entry({
    id,
    name: id,
    amount: Money.fromCents(cents),
    dueDay,
    kind,
    recurrence: 'monthly',
    createdAt: M(2026, 1),
    deletedFromMonth: null,
    context: ExpenseContext.PF,
    valueType: EntryValueType.FIXED,
  })
}

describe('GetMonthlySummaryUseCase', () => {
  it('returns balance income - expense', async () => {
    const entryRepo = new StubEntryRepo([
      makeEntry('i1', 'income', 500000),
      makeEntry('e1', 'expense', 150000),
    ])
    const statusRepo = new StubStatusRepo()
    const uc = new GetMonthlySummaryUseCase(entryRepo, statusRepo)

    const r = await uc.execute(M(2026, 6), ExpenseContext.PF)
    expect(r.totalIncomeInCents).toBe(500000)
    expect(r.totalExpenseInCents).toBe(150000)
    expect(r.balanceInCents).toBe(350000)
    expect(r.incomeCount).toBe(1)
    expect(r.expenseCount).toBe(1)
  })

  it('counts skipped separately and excludes from totals', async () => {
    const entryRepo = new StubEntryRepo([
      makeEntry('i1', 'income', 100),
      makeEntry('e1', 'expense', 50),
    ])
    const statusRepo = new StubStatusRepo(
      new Map([['i1', EntryStatus.SKIPPED]]),
    )
    const uc = new GetMonthlySummaryUseCase(entryRepo, statusRepo)
    const r = await uc.execute(M(2026, 6), ExpenseContext.PF)
    expect(r.totalIncomeInCents).toBe(0)
    expect(r.totalExpenseInCents).toBe(50)
    expect(r.skippedCount).toBe(1)
  })
})
