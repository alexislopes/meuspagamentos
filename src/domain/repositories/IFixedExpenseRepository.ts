import type { FixedExpense } from '../entities/FixedExpense'
import type { ExpenseContext } from '../value-objects/ExpenseContext'

export interface IFixedExpenseRepository {
  getAll(context: ExpenseContext): Promise<FixedExpense[]>
  getById(id: string): Promise<FixedExpense | null>
  save(expense: FixedExpense): Promise<void>
  update(expense: FixedExpense): Promise<void>
}
