import { describe, it, expect } from 'vitest'
import { FormulaResolver } from './FormulaResolver'
import {
  EntryStatus,
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../value-objects/EntryStatus'
import { ExpenseContext } from '../value-objects/ExpenseContext'
import { Money } from '../value-objects/Money'
import type { EntryFormula } from '../value-objects/EntryFormula'
import type { MonthlyEntryView } from '../entities/MonthlyEntryView'

const view = (overrides: Partial<MonthlyEntryView>): MonthlyEntryView => ({
  entryId: overrides.entryId ?? 'x',
  name: overrides.name ?? 'x',
  amount: overrides.amount ?? Money.fromCents(0),
  dueDay: overrides.dueDay ?? 1,
  kind: overrides.kind ?? 'income',
  status: overrides.status ?? EntryStatus.PENDING,
  context: overrides.context ?? ExpenseContext.PJ,
  valueType: EntryValueType.FIXED,
  formulaDescription: undefined,
})

describe('FormulaResolver', () => {
  const resolver = new FormulaResolver()

  it('sums all incomes and applies percentage', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 10,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [
        view({ entryId: 'a', kind: 'income', amount: Money.fromCents(50000) }),
        view({ entryId: 'b', kind: 'income', amount: Money.fromCents(30000) }),
        view({ entryId: 'c', kind: 'expense', amount: Money.fromCents(10000) }),
      ],
    })
    expect(result.inCents).toBe(8000)
  })

  it('filters by ownerContext', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 10,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [
        view({ entryId: 'a', kind: 'income', amount: Money.fromCents(100000), context: ExpenseContext.PF }),
        view({ entryId: 'b', kind: 'income', amount: Money.fromCents(50000), context: ExpenseContext.PJ }),
      ],
    })
    expect(result.inCents).toBe(5000)
  })

  it('combines positive and negative terms', () => {
    const formula: EntryFormula = {
      terms: [
        { set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE },
        { set: { type: FormulaSetType.EXPLICIT, entryIds: ['ret1'] }, sign: FormulaTermSign.NEGATIVE },
      ],
      percentage: 6,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [
        view({ entryId: 'inc1', kind: 'income', amount: Money.fromCents(100000) }),
        view({ entryId: 'ret1', kind: 'expense', amount: Money.fromCents(20000) }),
      ],
    })
    expect(result.inCents).toBe(4800)
  })

  it('excludes SKIPPED views', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 10,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [
        view({ entryId: 'a', kind: 'income', amount: Money.fromCents(50000), status: EntryStatus.PENDING }),
        view({ entryId: 'b', kind: 'income', amount: Money.fromCents(50000), status: EntryStatus.SKIPPED }),
      ],
    })
    expect(result.inCents).toBe(5000)
  })

  it('clamps negative results to zero', () => {
    const formula: EntryFormula = {
      terms: [
        { set: { type: FormulaSetType.EXPLICIT, entryIds: ['a'] }, sign: FormulaTermSign.NEGATIVE },
      ],
      percentage: 100,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [view({ entryId: 'a', kind: 'income', amount: Money.fromCents(50000) })],
    })
    expect(result.inCents).toBe(0)
  })

  it('rounds half-up to nearest cent', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 33.333,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [view({ entryId: 'a', kind: 'income', amount: Money.fromCents(99999) })],
    })
    expect(result.inCents).toBe(33333)
  })

  it('rejects empty terms', () => {
    expect(() =>
      new FormulaResolver().resolve({
        formula: { terms: [], percentage: 10 },
        ownerContext: ExpenseContext.PJ,
        fixedViews: [],
      }),
    ).toThrow(/at least one term/i)
  })

  it('rejects non-positive percentage', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 0,
    }
    expect(() =>
      new FormulaResolver().resolve({
        formula,
        ownerContext: ExpenseContext.PJ,
        fixedViews: [],
      }),
    ).toThrow(/percentage/i)
  })
})
