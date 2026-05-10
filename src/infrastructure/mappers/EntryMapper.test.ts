import { describe, it, expect } from 'vitest'
import { EntryMapper, type EntryJSON } from './EntryMapper'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import {
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../../domain/value-objects/EntryStatus'

describe('EntryMapper', () => {
  it('round-trips kind and recurrence', () => {
    const json: EntryJSON = {
      valueType: EntryValueType.FIXED,
      id: 'e1',
      name: 'Salário',
      amountInCents: 800000,
      dueDay: 5,
      kind: 'income',
      recurrence: 'monthly',
      createdAt: '2026-01',
      deletedFromMonth: null,
      context: ExpenseContext.PF,
    }
    const entity = EntryMapper.toDomain(json)
    expect(entity.kind).toBe('income')
    expect(entity.recurrence).toBe('monthly')

    const back = EntryMapper.toJSON(entity)
    expect(back.kind).toBe('income')
    expect(back.recurrence).toBe('monthly')
    if (back.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
    expect(back.amountInCents).toBe(800000)
  })

  it('round-trips revisions', () => {
    const json: EntryJSON = {
      valueType: EntryValueType.FIXED,
      id: 'e2',
      name: 'Aluguel',
      amountInCents: 150000,
      dueDay: 5,
      kind: 'expense',
      recurrence: 'monthly',
      createdAt: '2026-01',
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      revisions: [
        {
          valueType: EntryValueType.FIXED,
          fromMonth: '2026-04',
          name: 'Aluguel novo',
          amountInCents: 160000,
          dueDay: 10,
        },
      ],
    }
    const entity = EntryMapper.toDomain(json)
    expect(entity.revisions.length).toBe(1)
    const back = EntryMapper.toJSON(entity)
    if (back.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
    expect(back.revisions?.[0].fromMonth).toBe('2026-04')
    expect(back.revisions?.[0].amountInCents).toBe(160000)
  })

  it('handles once recurrence with no revisions', () => {
    const json: EntryJSON = {
      valueType: EntryValueType.FIXED,
      id: 'e3',
      name: 'Bônus',
      amountInCents: 50000,
      dueDay: 15,
      kind: 'income',
      recurrence: 'once',
      createdAt: '2026-05',
      deletedFromMonth: null,
      context: ExpenseContext.PF,
    }
    const entity = EntryMapper.toDomain(json)
    expect(entity.recurrence).toBe('once')
    const back = EntryMapper.toJSON(entity)
    expect(back.recurrence).toBe('once')
  })

  it('round-trips a relative entry', () => {
    const json: EntryJSON = {
      valueType: EntryValueType.RELATIVE,
      id: 'r1',
      name: 'Imposto',
      dueDay: 20,
      kind: 'expense',
      recurrence: 'monthly',
      createdAt: '2026-01',
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      formula: {
        terms: [
          { set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE },
        ],
        percentage: 20,
      },
    }
    const e = EntryMapper.toDomain(json)
    expect(e.valueType).toBe(EntryValueType.RELATIVE)
    expect(e.formula?.percentage).toBe(20)
    const back = EntryMapper.toJSON(e)
    expect(back).toEqual(json)
  })

  it('round-trips a relative entry with formula revisions', () => {
    const json: EntryJSON = {
      valueType: EntryValueType.RELATIVE,
      id: 'r2',
      name: 'Imposto',
      dueDay: 20,
      kind: 'expense',
      recurrence: 'monthly',
      createdAt: '2026-01',
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      formula: {
        terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
        percentage: 15,
      },
      revisions: [
        {
          valueType: EntryValueType.RELATIVE,
          fromMonth: '2026-04',
          name: 'Imposto novo',
          formula: {
            terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
            percentage: 20,
          },
          dueDay: 25,
        },
      ],
    }
    const e = EntryMapper.toDomain(json)
    expect(e.revisions[0].valueType).toBe(EntryValueType.RELATIVE)
    const back = EntryMapper.toJSON(e)
    expect(back).toEqual(json)
  })
})
