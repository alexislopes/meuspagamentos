import type {
  EntryKind,
  EntryStatus,
  EntryValueType,
} from '../../domain/value-objects/EntryStatus'

export interface MonthlyEntryDTO {
  entryId: string
  name: string
  amountInCents: number
  dueDay: number
  kind: EntryKind
  status: EntryStatus
  valueType: EntryValueType
  formulaDescription?: string
}
