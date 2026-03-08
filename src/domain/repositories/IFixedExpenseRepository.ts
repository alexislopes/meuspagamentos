import type { FixedExpense } from '../entities/FixedExpense'

export interface IFixedExpenseRepository {
  getAll(): Promise<FixedExpense[]>
  getById(id: string): Promise<FixedExpense | null>
  save(expense: FixedExpense): Promise<void>
  update(expense: FixedExpense): Promise<void>
}
