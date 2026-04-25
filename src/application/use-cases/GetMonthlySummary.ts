import type { IFixedExpenseRepository } from '../../domain/repositories/IFixedExpenseRepository'
import type { IExpenseStatusRepository } from '../../domain/repositories/IExpenseStatusRepository'
import { MonthlyExpenseService } from '../../domain/services/MonthlyExpenseService'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { ExpenseStatus } from '../../domain/value-objects/ExpenseStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import type { MonthlySummaryDTO } from '../dto/MonthlySummaryDTO'

export class GetMonthlySummaryUseCase {
  private readonly domainService = new MonthlyExpenseService()

  constructor(
    private readonly expenseRepo: IFixedExpenseRepository,
    private readonly statusRepo: IExpenseStatusRepository,
  ) {}

  async execute(month: YearMonth, context: ExpenseContext): Promise<MonthlySummaryDTO> {
    const allExpenses = await this.expenseRepo.getAll(context)
    const statuses = await this.statusRepo.getStatusesForMonth(month)
    const views = this.domainService.buildMonthView(allExpenses, month, statuses)
    const summary = this.domainService.computeSummary(views)

    return {
      totalInCents: summary.total,
      totalPaidInCents: summary.totalPaid,
      totalPendingInCents: summary.totalPending,
      expenseCount: views.filter((v) => v.status !== ExpenseStatus.SKIPPED).length,
      paidCount: views.filter((v) => v.status === ExpenseStatus.PAID).length,
      pendingCount: views.filter((v) => v.status === ExpenseStatus.PENDING).length,
      skippedCount: views.filter((v) => v.status === ExpenseStatus.SKIPPED).length,
    }
  }
}
