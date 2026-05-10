import { describe, it, expect } from 'vitest'
import { Entry } from './Entry'
import { Money } from '../value-objects/Money'
import { YearMonth } from '../value-objects/YearMonth'
import { ExpenseContext } from '../value-objects/ExpenseContext'
import {
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../value-objects/EntryStatus'
import type { EntryFormula } from '../value-objects/EntryFormula'

const baseProps = {
  id: 'e1',
  name: 'Aluguel',
  amount: Money.fromCents(150000),
  dueDay: 5,
  kind: 'expense' as const,
  recurrence: 'monthly' as const,
  createdAt: YearMonth.of(2026, 1),
  deletedFromMonth: null,
  context: ExpenseContext.PF,
  valueType: EntryValueType.FIXED,
}

const sampleFormula: EntryFormula = {
  terms: [
    {
      set: { type: FormulaSetType.ALL, kind: 'income' },
      sign: FormulaTermSign.POSITIVE,
    },
  ],
  percentage: 10,
}

const relativeProps = {
  id: 'r1',
  name: 'Imposto',
  dueDay: 20,
  kind: 'expense' as const,
  recurrence: 'monthly' as const,
  createdAt: YearMonth.of(2026, 1),
  deletedFromMonth: null,
  context: ExpenseContext.PJ,
  valueType: EntryValueType.RELATIVE,
  formula: sampleFormula,
}

describe('Entry constructor', () => {
  it('rejects dueDay < 1', () => {
    expect(() => new Entry({ ...baseProps, dueDay: 0 })).toThrow(/Due day/)
  })

  it('rejects dueDay > 31', () => {
    expect(() => new Entry({ ...baseProps, dueDay: 32 })).toThrow(/Due day/)
  })

  it('rejects empty name', () => {
    expect(() => new Entry({ ...baseProps, name: '   ' })).toThrow(/name/)
  })

  it('trims name', () => {
    const e = new Entry({ ...baseProps, name: '  Aluguel  ' })
    expect(e.name).toBe('Aluguel')
  })

  it('rejects revisions on once recurrence', () => {
    expect(() =>
      new Entry({
        ...baseProps,
        recurrence: 'once',
        revisions: [
          {
            valueType: EntryValueType.FIXED,
            fromMonth: YearMonth.of(2026, 2),
            name: 'x',
            amount: Money.fromCents(100),
            dueDay: 1,
          },
        ],
      }),
    ).toThrow(/one-off/i)
  })
})

describe('Entry constructor (discriminated)', () => {
  it('rejects fixed without amount', () => {
    expect(() => new Entry({ ...baseProps, amount: undefined })).toThrow(/amount/i)
  })

  it('rejects fixed with formula', () => {
    expect(() => new Entry({ ...baseProps, formula: sampleFormula })).toThrow(/formula/i)
  })

  it('rejects relative without formula', () => {
    expect(() => new Entry({ ...relativeProps, formula: undefined })).toThrow(/formula/i)
  })

  it('rejects relative with amount', () => {
    expect(() => new Entry({ ...relativeProps, amount: Money.fromCents(100) })).toThrow(/amount/i)
  })

  it('rejects relative with once recurrence', () => {
    expect(() => new Entry({ ...relativeProps, recurrence: 'once' })).toThrow(/once|monthly/i)
  })

  it('accepts a valid relative entry', () => {
    const e = new Entry(relativeProps)
    expect(e.valueType).toBe(EntryValueType.RELATIVE)
    expect(e.formula).toEqual(sampleFormula)
    expect(e.amount).toBeUndefined()
  })
})

describe('Entry.isActiveInMonth (monthly)', () => {
  const entry = new Entry({ ...baseProps, createdAt: YearMonth.of(2026, 3) })

  it('inactive before createdAt', () => {
    expect(entry.isActiveInMonth(YearMonth.of(2026, 2))).toBe(false)
  })

  it('active in createdAt month', () => {
    expect(entry.isActiveInMonth(YearMonth.of(2026, 3))).toBe(true)
  })

  it('active in subsequent months', () => {
    expect(entry.isActiveInMonth(YearMonth.of(2026, 12))).toBe(true)
  })

  it('inactive after deletedFromMonth', () => {
    const e = new Entry({ ...baseProps, deletedFromMonth: YearMonth.of(2026, 6) })
    expect(e.isActiveInMonth(YearMonth.of(2026, 5))).toBe(true)
    expect(e.isActiveInMonth(YearMonth.of(2026, 6))).toBe(false)
    expect(e.isActiveInMonth(YearMonth.of(2026, 7))).toBe(false)
  })
})

describe('Entry.isActiveInMonth (once)', () => {
  const entry = new Entry({
    ...baseProps,
    recurrence: 'once',
    createdAt: YearMonth.of(2026, 4),
  })

  it('active only in createdAt month', () => {
    expect(entry.isActiveInMonth(YearMonth.of(2026, 3))).toBe(false)
    expect(entry.isActiveInMonth(YearMonth.of(2026, 4))).toBe(true)
    expect(entry.isActiveInMonth(YearMonth.of(2026, 5))).toBe(false)
  })
})

describe('Entry.getValuesForMonth (fixed)', () => {
  it('returns base values when no revisions', () => {
    const e = new Entry({ ...baseProps })
    const v = e.getValuesForMonth(YearMonth.of(2026, 6))
    if (v.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
    expect(v.name).toBe('Aluguel')
    expect(v.amount.inCents).toBe(150000)
    expect(v.dueDay).toBe(5)
  })

  it('returns latest applicable revision for monthly', () => {
    const e = new Entry({ ...baseProps })
    e.addRevision({
      valueType: EntryValueType.FIXED,
      fromMonth: YearMonth.of(2026, 4),
      name: 'Aluguel novo',
      amount: Money.fromCents(160000),
      dueDay: 10,
    })
    e.addRevision({
      valueType: EntryValueType.FIXED,
      fromMonth: YearMonth.of(2026, 7),
      name: 'Aluguel reajuste',
      amount: Money.fromCents(170000),
      dueDay: 12,
    })

    const v3 = e.getValuesForMonth(YearMonth.of(2026, 3))
    if (v3.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
    expect(v3.amount.inCents).toBe(150000)

    const v5 = e.getValuesForMonth(YearMonth.of(2026, 5))
    if (v5.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
    expect(v5.amount.inCents).toBe(160000)

    const v9 = e.getValuesForMonth(YearMonth.of(2026, 9))
    if (v9.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
    expect(v9.amount.inCents).toBe(170000)
  })

  it('once entry returns base values regardless of month', () => {
    const e = new Entry({ ...baseProps, recurrence: 'once' })
    const v = e.getValuesForMonth(YearMonth.of(2026, 1))
    if (v.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
    expect(v.amount.inCents).toBe(150000)
  })
})

describe('Entry.getValuesForMonth (relative)', () => {
  it('returns name/formula/dueDay for relative without revisions', () => {
    const e = new Entry(relativeProps)
    const v = e.getValuesForMonth(YearMonth.of(2026, 6))
    expect(v.valueType).toBe(EntryValueType.RELATIVE)
    if (v.valueType === EntryValueType.RELATIVE) {
      expect(v.formula).toEqual(sampleFormula)
      expect(v.dueDay).toBe(20)
    }
  })

  it('returns latest applicable formula revision', () => {
    const e = new Entry(relativeProps)
    const newFormula: EntryFormula = { ...sampleFormula, percentage: 20 }
    e.addRevision({
      valueType: EntryValueType.RELATIVE,
      fromMonth: YearMonth.of(2026, 4),
      name: 'Imposto novo',
      formula: newFormula,
      dueDay: 25,
    })
    const v3 = e.getValuesForMonth(YearMonth.of(2026, 3))
    if (v3.valueType === EntryValueType.RELATIVE) expect(v3.formula.percentage).toBe(10)
    const v5 = e.getValuesForMonth(YearMonth.of(2026, 5))
    if (v5.valueType === EntryValueType.RELATIVE) expect(v5.formula.percentage).toBe(20)
  })
})

describe('Entry.addRevision', () => {
  it('rejects on once recurrence', () => {
    const e = new Entry({ ...baseProps, recurrence: 'once' })
    expect(() =>
      e.addRevision({
        valueType: EntryValueType.FIXED,
        fromMonth: YearMonth.of(2026, 2),
        name: 'x',
        amount: Money.fromCents(1),
        dueDay: 1,
      }),
    ).toThrow(/once|one-off/i)
  })

  it('replaces an existing revision in same month', () => {
    const e = new Entry({ ...baseProps })
    e.addRevision({
      valueType: EntryValueType.FIXED,
      fromMonth: YearMonth.of(2026, 4),
      name: 'v1',
      amount: Money.fromCents(100),
      dueDay: 10,
    })
    e.addRevision({
      valueType: EntryValueType.FIXED,
      fromMonth: YearMonth.of(2026, 4),
      name: 'v2',
      amount: Money.fromCents(200),
      dueDay: 11,
    })
    expect(e.revisions.length).toBe(1)
    const r = e.revisions[0]
    if (r.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
    expect(r.name).toBe('v2')
    expect(r.amount.inCents).toBe(200)
  })

  it('rejects fixed-shaped revision on a relative entry', () => {
    const e = new Entry(relativeProps)
    expect(() =>
      e.addRevision({
        valueType: EntryValueType.FIXED,
        fromMonth: YearMonth.of(2026, 2),
        name: 'x',
        amount: Money.fromCents(100),
        dueDay: 1,
      }),
    ).toThrow(/value/i)
  })
})
