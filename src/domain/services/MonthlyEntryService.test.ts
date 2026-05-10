import { describe, it, expect } from 'vitest'
import { MonthlyEntryService } from './MonthlyEntryService'
import { Entry } from '../entities/Entry'
import { Money } from '../value-objects/Money'
import { YearMonth } from '../value-objects/YearMonth'
import { ExpenseContext } from '../value-objects/ExpenseContext'
import { EntryStatus, EntryValueType, FormulaSetType, FormulaTermSign } from '../value-objects/EntryStatus'
import type { EntryFormula } from '../value-objects/EntryFormula'

const M = (year: number, month: number) => YearMonth.of(year, month)

function makeEntry(overrides: Partial<{
  id: string
  name: string
  amountCents: number
  dueDay: number
  kind: 'expense' | 'income'
  recurrence: 'monthly' | 'once'
  createdAt: YearMonth
  deletedFromMonth: YearMonth | null
}>): Entry {
  return new Entry({
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'X',
    amount: Money.fromCents(overrides.amountCents ?? 1000),
    dueDay: overrides.dueDay ?? 1,
    kind: overrides.kind ?? 'expense',
    recurrence: overrides.recurrence ?? 'monthly',
    createdAt: overrides.createdAt ?? M(2026, 1),
    deletedFromMonth: overrides.deletedFromMonth ?? null,
    context: ExpenseContext.PF,
    valueType: EntryValueType.FIXED,
  })
}

describe('MonthlyEntryService.buildMonthView', () => {
  const service = new MonthlyEntryService()

  it('filters by month and sorts by dueDay', () => {
    const entries = [
      makeEntry({ id: 'a', dueDay: 20, kind: 'expense' }),
      makeEntry({ id: 'b', dueDay: 5, kind: 'income' }),
      makeEntry({ id: 'c', dueDay: 10, kind: 'expense', createdAt: M(2027, 1) }),
    ]
    const views = service.buildMonthView(entries, M(2026, 6), new Map(), new Map())
    expect(views.map((v) => v.entryId)).toEqual(['b', 'a'])
  })

  it('propagates kind into the view', () => {
    const entries = [
      makeEntry({ id: 'a', kind: 'income' }),
      makeEntry({ id: 'b', kind: 'expense' }),
    ]
    const views = service.buildMonthView(entries, M(2026, 6), new Map(), new Map())
    expect(views.find((v) => v.entryId === 'a')?.kind).toBe('income')
    expect(views.find((v) => v.entryId === 'b')?.kind).toBe('expense')
  })

  it('applies status overrides; default is pending', () => {
    const entries = [
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b' }),
    ]
    const overrides = new Map([['a', EntryStatus.CONFIRMED]])
    const views = service.buildMonthView(entries, M(2026, 6), overrides, new Map())
    expect(views.find((v) => v.entryId === 'a')?.status).toBe(EntryStatus.CONFIRMED)
    expect(views.find((v) => v.entryId === 'b')?.status).toBe(EntryStatus.PENDING)
  })

  it('once entries appear only in their createdAt month', () => {
    const entries = [
      makeEntry({ id: 'oneoff', recurrence: 'once', createdAt: M(2026, 6), kind: 'income' }),
    ]
    expect(service.buildMonthView(entries, M(2026, 5), new Map(), new Map())).toEqual([])
    expect(service.buildMonthView(entries, M(2026, 6), new Map(), new Map())).toHaveLength(1)
    expect(service.buildMonthView(entries, M(2026, 7), new Map(), new Map())).toEqual([])
  })
})

describe('MonthlyEntryService.computeSummary', () => {
  const service = new MonthlyEntryService()

  it('separates income and expense totals; computes balance', () => {
    const entries = [
      makeEntry({ id: 'i1', kind: 'income', amountCents: 500000 }),
      makeEntry({ id: 'e1', kind: 'expense', amountCents: 150000 }),
      makeEntry({ id: 'e2', kind: 'expense', amountCents: 50000 }),
    ]
    const views = service.buildMonthView(entries, M(2026, 6), new Map(), new Map())
    const s = service.computeSummary(views)
    expect(s.totalIncome).toBe(500000)
    expect(s.totalExpense).toBe(200000)
    expect(s.balance).toBe(300000)
  })

  it('skipped entries are ignored from totals', () => {
    const entries = [
      makeEntry({ id: 'i1', kind: 'income', amountCents: 500000 }),
      makeEntry({ id: 'e1', kind: 'expense', amountCents: 100000 }),
    ]
    const overrides = new Map([
      ['i1', EntryStatus.SKIPPED],
      ['e1', EntryStatus.SKIPPED],
    ])
    const views = service.buildMonthView(entries, M(2026, 6), overrides, new Map())
    const s = service.computeSummary(views)
    expect(s.totalIncome).toBe(0)
    expect(s.totalExpense).toBe(0)
    expect(s.balance).toBe(0)
  })

  it('separates confirmed vs pending per kind', () => {
    const entries = [
      makeEntry({ id: 'i1', kind: 'income', amountCents: 300 }),
      makeEntry({ id: 'i2', kind: 'income', amountCents: 700 }),
      makeEntry({ id: 'e1', kind: 'expense', amountCents: 200 }),
      makeEntry({ id: 'e2', kind: 'expense', amountCents: 800 }),
    ]
    const overrides = new Map([
      ['i1', EntryStatus.CONFIRMED],
      ['e2', EntryStatus.CONFIRMED],
    ])
    const views = service.buildMonthView(entries, M(2026, 6), overrides, new Map())
    const s = service.computeSummary(views)
    expect(s.confirmedIncome).toBe(300)
    expect(s.pendingIncome).toBe(700)
    expect(s.confirmedExpense).toBe(800)
    expect(s.pendingExpense).toBe(200)
  })

  it('balance can be negative', () => {
    const entries = [
      makeEntry({ id: 'i1', kind: 'income', amountCents: 100 }),
      makeEntry({ id: 'e1', kind: 'expense', amountCents: 500 }),
    ]
    const views = service.buildMonthView(entries, M(2026, 6), new Map(), new Map())
    const s = service.computeSummary(views)
    expect(s.balance).toBe(-400)
  })
})

describe('MonthlyEntryService.buildMonthView (relatives)', () => {
  const svc = new MonthlyEntryService()
  const month = M(2026, 6)
  const formula: EntryFormula = {
    terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
    percentage: 10,
  }

  function pjIncome(id: string, cents: number) {
    return new Entry({
      id,
      name: id,
      amount: Money.fromCents(cents),
      dueDay: 5,
      kind: 'income',
      recurrence: 'monthly',
      createdAt: M(2026, 1),
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      valueType: EntryValueType.FIXED,
    })
  }

  function pjTax(id: string) {
    return new Entry({
      id,
      name: 'Imposto',
      formula,
      dueDay: 20,
      kind: 'expense',
      recurrence: 'monthly',
      createdAt: M(2026, 1),
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      valueType: EntryValueType.RELATIVE,
    })
  }

  it('resolves a relative entry from fixed views', () => {
    const views = svc.buildMonthView(
      [pjIncome('inc', 100000), pjTax('tax')],
      month,
      new Map(),
      new Map(),
    )
    const taxView = views.find((v) => v.entryId === 'tax')!
    expect(taxView.amount.inCents).toBe(10000)
  })

  it('uses snapshot when present', () => {
    const statuses = new Map([['tax', EntryStatus.CONFIRMED]])
    const snapshots = new Map([['tax', 7777]])
    const views = svc.buildMonthView(
      [pjIncome('inc', 100000), pjTax('tax')],
      month,
      statuses,
      snapshots,
    )
    const taxView = views.find((v) => v.entryId === 'tax')!
    expect(taxView.amount.inCents).toBe(7777)
    expect(taxView.status).toBe(EntryStatus.CONFIRMED)
  })
})
