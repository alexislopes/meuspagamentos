import type { Money } from '../value-objects/Money'
import type { EntryKind, EntryStatus } from '../value-objects/EntryStatus'

export interface MonthlyEntryView {
  readonly entryId: string
  readonly name: string
  readonly amount: Money
  readonly dueDay: number
  readonly kind: EntryKind
  readonly status: EntryStatus
}
