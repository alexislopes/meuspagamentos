import { describe, it, expect } from 'vitest'
import { GetAverageMonthlyIncomeUseCase } from './GetAverageMonthlyIncome'
import { GetAverageMonthlyCostUseCase } from './GetAverageMonthlyCost'
import { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'

class StubEntryRepo implements IEntryRepository {
  constructor(private entries: Entry[]) {}
  async getAll() { return this.entries }
  async getById() { return null }
  async save() {}
  async update() {}
}

class StubStatusRepo implements IEntryStatusRepository {
  async getStatusesForMonth() { return new Map() }
  async getStatusesForMonths() { return new Map() }
  async setStatus() {}
  async removeStatus() {}
}

function makeEntry(kind: 'income' | 'expense', cents: number, createdAt: YearMonth): Entry {
  return new Entry({
    id: crypto.randomUUID(),
    name: 'X',
    amount: Money.fromCents(cents),
    dueDay: 1,
    kind,
    recurrence: 'monthly',
    createdAt,
    deletedFromMonth: null,
    context: ExpenseContext.PF,
  })
}

describe('GetAverageMonthlyIncomeUseCase', () => {
  it('averages only months with income > 0', async () => {
    const longAgo = YearMonth.current().previous().previous()
    const entries = [makeEntry('income', 300000, longAgo)]
    const uc = new GetAverageMonthlyIncomeUseCase(
      new StubEntryRepo(entries),
      new StubStatusRepo(),
    )
    const r = await uc.execute(ExpenseContext.PF)
    expect(r.averageInCents).toBe(300000)
    expect(r.monthsWithData).toBeGreaterThan(0)
  })

  it('expenses do not contribute to income average', async () => {
    const longAgo = YearMonth.current().previous().previous()
    const entries = [makeEntry('expense', 999999, longAgo)]
    const uc = new GetAverageMonthlyIncomeUseCase(
      new StubEntryRepo(entries),
      new StubStatusRepo(),
    )
    const r = await uc.execute(ExpenseContext.PF)
    expect(r.averageInCents).toBe(0)
    expect(r.monthsWithData).toBe(0)
  })
})

describe('GetAverageMonthlyCostUseCase', () => {
  it('income does not contribute to cost average', async () => {
    const longAgo = YearMonth.current().previous().previous()
    const entries = [makeEntry('income', 999999, longAgo)]
    const uc = new GetAverageMonthlyCostUseCase(
      new StubEntryRepo(entries),
      new StubStatusRepo(),
    )
    const r = await uc.execute(ExpenseContext.PF)
    expect(r.averageInCents).toBe(0)
    expect(r.monthsWithData).toBe(0)
  })
})
