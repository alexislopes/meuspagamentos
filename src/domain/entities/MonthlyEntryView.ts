import type { Money } from '../value-objects/Money'
import type { ExpenseContext } from '../value-objects/ExpenseContext'
import type {
  EntryKind,
  EntryStatus,
  EntryValueType,
} from '../value-objects/EntryStatus'

export interface MonthlyEntryView {
  readonly entryId: string
  readonly name: string
  readonly amount: Money
  readonly dueDay: number
  readonly kind: EntryKind
  readonly status: EntryStatus
  readonly context: ExpenseContext
  readonly valueType: EntryValueType
  readonly formulaDescription?: string
}
