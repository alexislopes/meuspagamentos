import { describe, it, expect } from 'vitest'
import { EntryMapper, type EntryJSON } from './EntryMapper'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'

describe('EntryMapper', () => {
  it('round-trips kind and recurrence', () => {
    const json: EntryJSON = {
      id: 'e1',
      name: 'Salário',
      amountInCents: 800000,
      dueDay: 5,
      kind: 'income',
      recurrence: 'monthly',
      createdAt: '2026-01',
      deletedFromMonth: null,
      context: ExpenseContext.PF,
      revisions: [],
    }
    const entity = EntryMapper.toDomain(json)
    expect(entity.kind).toBe('income')
    expect(entity.recurrence).toBe('monthly')

    const back = EntryMapper.toJSON(entity)
    expect(back.kind).toBe('income')
    expect(back.recurrence).toBe('monthly')
    expect(back.amountInCents).toBe(800000)
  })

  it('round-trips revisions', () => {
    const json: EntryJSON = {
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
        { fromMonth: '2026-04', name: 'Aluguel novo', amountInCents: 160000, dueDay: 10 },
      ],
    }
    const entity = EntryMapper.toDomain(json)
    expect(entity.revisions.length).toBe(1)
    const back = EntryMapper.toJSON(entity)
    expect(back.revisions?.[0].fromMonth).toBe('2026-04')
    expect(back.revisions?.[0].amountInCents).toBe(160000)
  })

  it('handles once recurrence with no revisions', () => {
    const json: EntryJSON = {
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
})
