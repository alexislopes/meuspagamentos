import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { MonthlyEntryService } from '../../domain/services/MonthlyEntryService'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { EntryStatus } from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import type { MonthlySummaryDTO } from '../dto/MonthlySummaryDTO'

export class GetMonthlySummaryUseCase {
  private readonly domainService = new MonthlyEntryService()

  constructor(
    private readonly entryRepo: IEntryRepository,
    private readonly statusRepo: IEntryStatusRepository,
  ) {}

  async execute(month: YearMonth, context: ExpenseContext): Promise<MonthlySummaryDTO> {
    const allEntries = await this.entryRepo.getAll(context)
    const statuses = await this.statusRepo.getStatusesForMonth(month)
    const views = this.domainService.buildMonthView(allEntries, month, statuses)
    const summary = this.domainService.computeSummary(views)

    const incomeViews = views.filter((v) => v.kind === 'income')
    const expenseViews = views.filter((v) => v.kind === 'expense')
    const notSkipped = views.filter((v) => v.status !== EntryStatus.SKIPPED)

    return {
      totalIncomeInCents: summary.totalIncome,
      totalExpenseInCents: summary.totalExpense,
      confirmedIncomeInCents: summary.confirmedIncome,
      pendingIncomeInCents: summary.pendingIncome,
      confirmedExpenseInCents: summary.confirmedExpense,
      pendingExpenseInCents: summary.pendingExpense,
      balanceInCents: summary.balance,
      incomeCount: incomeViews.filter((v) => v.status !== EntryStatus.SKIPPED).length,
      expenseCount: expenseViews.filter((v) => v.status !== EntryStatus.SKIPPED).length,
      confirmedCount: notSkipped.filter((v) => v.status === EntryStatus.CONFIRMED).length,
      pendingCount: notSkipped.filter((v) => v.status === EntryStatus.PENDING).length,
      skippedCount: views.filter((v) => v.status === EntryStatus.SKIPPED).length,
    }
  }
}
