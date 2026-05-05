import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import type { EntryKind, Recurrence } from '../../domain/value-objects/EntryStatus'

export interface CreateEntryDTO {
  name: string
  amount: number
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  context: ExpenseContext
}
