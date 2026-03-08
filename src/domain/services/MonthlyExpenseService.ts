import type { FixedExpense } from '../entities/FixedExpense'
import type { MonthlyExpenseView } from '../entities/MonthlyExpenseView'
import { ExpenseStatus } from '../value-objects/ExpenseStatus'
import type { YearMonth } from '../value-objects/YearMonth'

export class MonthlyExpenseService {
  buildMonthView(
    allExpenses: FixedExpense[],
    month: YearMonth,
    statusOverrides: Map<string, ExpenseStatus>,
  ): MonthlyExpenseView[] {
    return allExpenses
      .filter((expense) => expense.isActiveInMonth(month))
      .map((expense) => {
        const values = expense.getValuesForMonth(month)
        return {
          expenseId: expense.id,
          name: values.name,
          amount: values.amount,
          dueDay: values.dueDay,
          status: statusOverrides.get(expense.id) ?? ExpenseStatus.PENDING,
        }
      })
      .sort((a, b) => a.dueDay - b.dueDay)
  }

  computeSummary(views: MonthlyExpenseView[]) {
    let total = 0
    let totalPaid = 0
    let totalPending = 0

    for (const v of views) {
      if (v.status === ExpenseStatus.SKIPPED) continue
      total += v.amount.inCents
      if (v.status === ExpenseStatus.PAID) {
        totalPaid += v.amount.inCents
      } else if (v.status === ExpenseStatus.PENDING) {
        totalPending += v.amount.inCents
      }
    }

    return { total, totalPaid, totalPending }
  }
}
