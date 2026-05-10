import { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import {
  EntryValueType,
  FormulaSetType,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type {
  CreateEntryDTO,
  CreateFixedEntryDTO,
  CreateRelativeEntryDTO,
} from '../dto/CreateEntryDTO'

export class CreateEntryUseCase {
  constructor(private readonly entryRepo: IEntryRepository) {}

  async execute(dto: CreateEntryDTO): Promise<Entry> {
    if (dto.valueType === EntryValueType.FIXED) {
      return this.createFixed(dto)
    }
    return this.createRelative(dto)
  }

  private async createFixed(dto: CreateFixedEntryDTO): Promise<Entry> {
    const entry = new Entry({
      id: crypto.randomUUID(),
      name: dto.name,
      amount: Money.fromDecimal(dto.amount),
      dueDay: dto.dueDay,
      kind: dto.kind,
      recurrence: dto.recurrence,
      createdAt: YearMonth.current(),
      deletedFromMonth: null,
      context: dto.context,
      valueType: EntryValueType.FIXED,
    })
    await this.entryRepo.save(entry)
    return entry
  }

  private async createRelative(dto: CreateRelativeEntryDTO): Promise<Entry> {
    await this.validateFormula(dto.formula, dto.context)
    const entry = new Entry({
      id: crypto.randomUUID(),
      name: dto.name,
      formula: dto.formula,
      dueDay: dto.dueDay,
      kind: dto.kind,
      recurrence: 'monthly',
      createdAt: YearMonth.current(),
      deletedFromMonth: null,
      context: dto.context,
      valueType: EntryValueType.RELATIVE,
    })
    await this.entryRepo.save(entry)
    return entry
  }

  private async validateFormula(formula: EntryFormula, ownerContext: ExpenseContext): Promise<void> {
    if (formula.terms.length === 0) {
      throw new Error('Formula must have at least one term')
    }
    if (formula.percentage <= 0) {
      throw new Error('Formula percentage must be > 0')
    }
    const explicitIds: string[] = []
    for (const t of formula.terms) {
      if (t.set.type === FormulaSetType.EXPLICIT) explicitIds.push(...t.set.entryIds)
    }

    for (const id of explicitIds) {
      const ref = await this.entryRepo.getById(id)
      if (!ref) throw new Error(`Referenced entry not found: ${id}`)
      if (ref.valueType === EntryValueType.RELATIVE) {
        throw new Error(`Relative entries cannot reference other relative entries (id=${id})`)
      }
      if (ref.context !== ownerContext) {
        throw new Error(`Referenced entry must share context (id=${id})`)
      }
    }
  }
}
