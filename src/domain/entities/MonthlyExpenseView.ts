import type { Money } from '../value-objects/Money'
import type { ExpenseStatus } from '../value-objects/ExpenseStatus'

export interface MonthlyExpenseView {
  readonly expenseId: string
  readonly name: string
  readonly amount: Money
  readonly dueDay: number
  readonly status: ExpenseStatus
}
