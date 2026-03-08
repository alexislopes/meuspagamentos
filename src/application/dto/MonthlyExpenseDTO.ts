import type { ExpenseStatus } from '../../domain/value-objects/ExpenseStatus'

export interface MonthlyExpenseDTO {
  expenseId: string
  name: string
  amountInCents: number
  dueDay: number
  status: ExpenseStatus
}
