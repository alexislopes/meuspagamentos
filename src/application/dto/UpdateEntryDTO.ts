import type { EntryValueType } from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'

export interface UpdateFixedEntryDTO {
  valueType: EntryValueType.FIXED
  entryId: string
  name: string
  amount: number
  dueDay: number
  effectiveFromMonth: string
}

export interface UpdateRelativeEntryDTO {
  valueType: EntryValueType.RELATIVE
  entryId: string
  name: string
  formula: EntryFormula
  dueDay: number
  effectiveFromMonth: string
}

export type UpdateEntryDTO = UpdateFixedEntryDTO | UpdateRelativeEntryDTO
