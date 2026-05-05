import type { EntryKind, EntryStatus } from '../../domain/value-objects/EntryStatus'

export interface MonthlyEntryDTO {
  entryId: string
  name: string
  amountInCents: number
  dueDay: number
  kind: EntryKind
  status: EntryStatus
}
