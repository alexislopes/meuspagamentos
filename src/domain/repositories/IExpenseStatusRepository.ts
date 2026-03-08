import type { ExpenseStatus } from '../value-objects/ExpenseStatus'
import type { YearMonth } from '../value-objects/YearMonth'

export interface IExpenseStatusRepository {
  getStatusesForMonth(month: YearMonth): Promise<Map<string, ExpenseStatus>>
  setStatus(month: YearMonth, expenseId: string, status: ExpenseStatus): Promise<void>
  removeStatus(month: YearMonth, expenseId: string): Promise<void>
}
