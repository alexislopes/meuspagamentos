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

  async getStatusesForMonths(months: YearMonth[]): Promise<Map<string, Map<string, ExpenseStatus>>> {
    const monthKeys = months.map((m) => m.key)

    const { data, error } = await supabase
      .from('expense_statuses')
      .select('month, expense_id, status')
      .in('month', monthKeys)

    if (error) throw new Error(`Failed to fetch statuses: ${error.message}`)

    const result = new Map<string, Map<string, ExpenseStatus>>()
    for (const row of data as ExpenseStatusRow[]) {
      if (!Object.values(ExpenseStatus).includes(row.status as ExpenseStatus)) continue
      let monthMap = result.get(row.month)
      if (!monthMap) {
        monthMap = new Map<string, ExpenseStatus>()
        result.set(row.month, monthMap)
      }
      monthMap.set(row.expense_id, row.status as ExpenseStatus)
    }
    return result
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
