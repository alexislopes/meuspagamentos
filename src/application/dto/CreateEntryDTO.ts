import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import type {
  EntryKind,
  EntryValueType,
  Recurrence,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'

export interface CreateFixedEntryDTO {
  valueType: EntryValueType.FIXED
  name: string
  amount: number
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  context: ExpenseContext
}

export interface CreateRelativeEntryDTO {
  valueType: EntryValueType.RELATIVE
  name: string
  formula: EntryFormula
  dueDay: number
  kind: EntryKind
  context: ExpenseContext
}

export type CreateEntryDTO = CreateFixedEntryDTO | CreateRelativeEntryDTO
