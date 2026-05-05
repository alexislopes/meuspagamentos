import { describe, it, expect } from 'vitest'
import { Entry } from './Entry'
import { Money } from '../value-objects/Money'
import { YearMonth } from '../value-objects/YearMonth'
import { ExpenseContext } from '../value-objects/ExpenseContext'

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
          { fromMonth: YearMonth.of(2026, 2), name: 'x', amount: Money.fromCents(100), dueDay: 1 },
        ],
      }),
    ).toThrow(/one-off/i)
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

describe('Entry.getValuesForMonth', () => {
  it('returns base values when no revisions', () => {
    const e = new Entry({ ...baseProps })
    const v = e.getValuesForMonth(YearMonth.of(2026, 6))
    expect(v.name).toBe('Aluguel')
    expect(v.amount.inCents).toBe(150000)
    expect(v.dueDay).toBe(5)
  })

  it('returns latest applicable revision for monthly', () => {
    const e = new Entry({ ...baseProps })
    e.addRevision(YearMonth.of(2026, 4), 'Aluguel novo', Money.fromCents(160000), 10)
    e.addRevision(YearMonth.of(2026, 7), 'Aluguel reajuste', Money.fromCents(170000), 12)

    const v3 = e.getValuesForMonth(YearMonth.of(2026, 3))
    expect(v3.amount.inCents).toBe(150000)

    const v5 = e.getValuesForMonth(YearMonth.of(2026, 5))
    expect(v5.amount.inCents).toBe(160000)

    const v9 = e.getValuesForMonth(YearMonth.of(2026, 9))
    expect(v9.amount.inCents).toBe(170000)
  })

  it('once entry returns base values regardless of month', () => {
    const e = new Entry({ ...baseProps, recurrence: 'once' })
    const v = e.getValuesForMonth(YearMonth.of(2026, 1))
    expect(v.amount.inCents).toBe(150000)
  })
})

describe('Entry.addRevision', () => {
  it('rejects on once recurrence', () => {
    const e = new Entry({ ...baseProps, recurrence: 'once' })
    expect(() =>
      e.addRevision(YearMonth.of(2026, 2), 'x', Money.fromCents(1), 1),
    ).toThrow(/once|one-off/i)
  })

  it('replaces an existing revision in same month', () => {
    const e = new Entry({ ...baseProps })
    e.addRevision(YearMonth.of(2026, 4), 'v1', Money.fromCents(100), 10)
    e.addRevision(YearMonth.of(2026, 4), 'v2', Money.fromCents(200), 11)
    expect(e.revisions.length).toBe(1)
    expect(e.revisions[0].name).toBe('v2')
    expect(e.revisions[0].amount.inCents).toBe(200)
  })
})
