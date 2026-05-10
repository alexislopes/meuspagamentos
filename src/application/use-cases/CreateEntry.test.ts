import { describe, it, expect, beforeEach } from 'vitest'
import { CreateEntryUseCase } from './CreateEntry'
import { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { ExpenseContext as ECtx } from '../../domain/value-objects/ExpenseContext'
import {
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../../domain/value-objects/EntryStatus'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'

class FakeRepo implements IEntryRepository {
  saved: Entry[] = []
  byId = new Map<string, Entry>()
  async getAll(_ctx: ECtx) { return Array.from(this.byId.values()) }
  async getById(id: string) { return this.byId.get(id) ?? null }
  async save(e: Entry) { this.saved.push(e); this.byId.set(e.id, e) }
  async update(e: Entry) { this.byId.set(e.id, e) }
}

const fixedDTO = {
  valueType: EntryValueType.FIXED as const,
  name: 'Aluguel',
  amount: 1500,
  dueDay: 5,
  kind: 'expense' as const,
  recurrence: 'monthly' as const,
  context: ExpenseContext.PF,
}

describe('CreateEntryUseCase — fixed', () => {
  it('saves a valid fixed entry', async () => {
    const repo = new FakeRepo()
    const uc = new CreateEntryUseCase(repo)
    const e = await uc.execute(fixedDTO)
    expect(e.valueType).toBe(EntryValueType.FIXED)
    expect(repo.saved.length).toBe(1)
  })
})

describe('CreateEntryUseCase — relative', () => {
  let repo: FakeRepo
  let uc: CreateEntryUseCase
  const fixed = new Entry({
    id: 'fix1',
    name: 'Cliente A',
    amount: Money.fromCents(100000),
    dueDay: 5,
    kind: 'income',
    recurrence: 'monthly',
    createdAt: YearMonth.of(2026, 1),
    deletedFromMonth: null,
    context: ExpenseContext.PJ,
    valueType: EntryValueType.FIXED,
  })

  beforeEach(() => {
    repo = new FakeRepo()
    repo.byId.set(fixed.id, fixed)
    uc = new CreateEntryUseCase(repo)
  })

  const baseRel = {
    valueType: EntryValueType.RELATIVE as const,
    name: 'Imposto',
    dueDay: 20,
    kind: 'expense' as const,
    context: ExpenseContext.PJ,
  }

  it('saves a valid relative entry', async () => {
    await uc.execute({
      ...baseRel,
      formula: {
        terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
        percentage: 10,
      },
    })
    expect(repo.saved.length).toBe(1)
    expect(repo.saved[0].valueType).toBe(EntryValueType.RELATIVE)
  })

  it('rejects empty terms', async () => {
    await expect(
      uc.execute({ ...baseRel, formula: { terms: [], percentage: 10 } }),
    ).rejects.toThrow(/term/i)
  })

  it('rejects percentage <= 0', async () => {
    await expect(
      uc.execute({
        ...baseRel,
        formula: {
          terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
          percentage: 0,
        },
      }),
    ).rejects.toThrow(/percentage/i)
  })

  it('rejects EXPLICIT term referencing non-existent entry', async () => {
    await expect(
      uc.execute({
        ...baseRel,
        formula: {
          terms: [{ set: { type: FormulaSetType.EXPLICIT, entryIds: ['missing'] }, sign: FormulaTermSign.POSITIVE }],
          percentage: 10,
        },
      }),
    ).rejects.toThrow(/not found|missing/i)
  })

  it('rejects EXPLICIT term referencing a relative entry', async () => {
    const rel = new Entry({
      id: 'rel-other',
      name: 'Outra rel',
      formula: {
        terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
        percentage: 5,
      },
      dueDay: 1,
      kind: 'expense',
      recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      valueType: EntryValueType.RELATIVE,
    })
    repo.byId.set(rel.id, rel)
    await expect(
      uc.execute({
        ...baseRel,
        formula: {
          terms: [{ set: { type: FormulaSetType.EXPLICIT, entryIds: [rel.id] }, sign: FormulaTermSign.POSITIVE }],
          percentage: 10,
        },
      }),
    ).rejects.toThrow(/relative/i)
  })

  it('rejects EXPLICIT term referencing entry from another context', async () => {
    const pf = new Entry({
      id: 'pf1',
      name: 'PF',
      amount: Money.fromCents(1000),
      dueDay: 1,
      kind: 'income',
      recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null,
      context: ExpenseContext.PF,
      valueType: EntryValueType.FIXED,
    })
    repo.byId.set(pf.id, pf)
    await expect(
      uc.execute({
        ...baseRel,
        formula: {
          terms: [{ set: { type: FormulaSetType.EXPLICIT, entryIds: [pf.id] }, sign: FormulaTermSign.POSITIVE }],
          percentage: 10,
        },
      }),
    ).rejects.toThrow(/context/i)
  })
})
