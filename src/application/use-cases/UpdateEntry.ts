import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import {
  EntryValueType,
  FormulaSetType,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { UpdateEntryDTO } from '../dto/UpdateEntryDTO'

export class UpdateEntryUseCase {
  constructor(private readonly entryRepo: IEntryRepository) {}

  async execute(dto: UpdateEntryDTO): Promise<void> {
    const entry = await this.entryRepo.getById(dto.entryId)
    if (!entry) throw new Error(`Entry not found: ${dto.entryId}`)
    if (entry.valueType !== dto.valueType) {
      throw new Error('Cannot change entry valueType')
    }
    const fromMonth = YearMonth.fromKey(dto.effectiveFromMonth)

    if (dto.valueType === EntryValueType.FIXED) {
      entry.addRevision({
        valueType: EntryValueType.FIXED,
        fromMonth,
        name: dto.name,
        amount: Money.fromDecimal(dto.amount),
        dueDay: dto.dueDay,
      })
    } else {
      await this.validateFormula(dto.formula, entry.context, dto.entryId)
      entry.addRevision({
        valueType: EntryValueType.RELATIVE,
        fromMonth,
        name: dto.name,
        formula: dto.formula,
        dueDay: dto.dueDay,
      })
    }

    await this.entryRepo.update(entry)
  }

  private async validateFormula(
    formula: EntryFormula,
    ownerContext: ExpenseContext,
    selfId: string,
  ): Promise<void> {
    if (formula.terms.length === 0) throw new Error('Formula must have at least one term')
    if (formula.percentage <= 0) throw new Error('Formula percentage must be > 0')
    const explicitIds: string[] = []
    for (const t of formula.terms) {
      if (t.set.type === FormulaSetType.EXPLICIT) explicitIds.push(...t.set.entryIds)
    }
    for (const id of explicitIds) {
      if (id === selfId) throw new Error('Formula cannot reference its own entry')
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
