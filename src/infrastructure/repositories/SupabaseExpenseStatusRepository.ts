import type { IExpenseStatusRepository } from '../../domain/repositories/IExpenseStatusRepository'
import { ExpenseStatus } from '../../domain/value-objects/ExpenseStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import { supabase } from '../supabase/client'

interface ExpenseStatusRow {
  month: string
  expense_id: string
  status: string
}

export class SupabaseExpenseStatusRepository implements IExpenseStatusRepository {
  async getStatusesForMonth(month: YearMonth): Promise<Map<string, ExpenseStatus>> {
    const { data, error } = await supabase
      .from('expense_statuses')
      .select('expense_id, status')
      .eq('month', month.key)

    if (error) throw new Error(`Failed to fetch statuses: ${error.message}`)

    const map = new Map<string, ExpenseStatus>()
    for (const row of (data as ExpenseStatusRow[])) {
      if (Object.values(ExpenseStatus).includes(row.status as ExpenseStatus)) {
        map.set(row.expense_id, row.status as ExpenseStatus)
      }
    }
    return map
  }

  async setStatus(month: YearMonth, expenseId: string, status: ExpenseStatus): Promise<void> {
    const { error } = await supabase
      .from('expense_statuses')
      .upsert({
        month: month.key,
        expense_id: expenseId,
        status,
      })

    if (error) throw new Error(`Failed to set status: ${error.message}`)
  }

  async removeStatus(month: YearMonth, expenseId: string): Promise<void> {
    const { error } = await supabase
      .from('expense_statuses')
      .delete()
      .eq('month', month.key)
      .eq('expense_id', expenseId)

    if (error) throw new Error(`Failed to remove status: ${error.message}`)
  }
}
