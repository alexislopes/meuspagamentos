export interface MonthlySummaryDTO {
  totalIncomeInCents: number
  totalExpenseInCents: number
  confirmedIncomeInCents: number
  pendingIncomeInCents: number
  confirmedExpenseInCents: number
  pendingExpenseInCents: number
  balanceInCents: number
  incomeCount: number
  expenseCount: number
  confirmedCount: number
  pendingCount: number
  skippedCount: number
}
