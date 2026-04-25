import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'

export interface CreateFixedExpenseDTO {
  name: string
  amount: number
  dueDay: number
  context: ExpenseContext
}
