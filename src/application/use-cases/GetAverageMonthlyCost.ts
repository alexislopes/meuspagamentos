import type { IFixedExpenseRepository } from '../../domain/repositories/IFixedExpenseRepository'
import type { IExpenseStatusRepository } from '../../domain/repositories/IExpenseStatusRepository'
import { MonthlyExpenseService } from '../../domain/services/MonthlyExpenseService'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { AverageMonthlyCostDTO } from '../dto/AverageMonthlyCostDTO'

export class GetAverageMonthlyCostUseCase {
  private readonly domainService = new MonthlyExpenseService()

  constructor(
    private readonly expenseRepo: IFixedExpenseRepository,
    private readonly statusRepo: IExpenseStatusRepository,
  ) {}

  async execute(): Promise<AverageMonthlyCostDTO> {
    const current = YearMonth.current()

    const months: YearMonth[] = []
    let m = current
    for (let i = 0; i < 12; i++) {
      months.unshift(m)
      m = m.previous()
    }

    const [allExpenses, allStatuses] = await Promise.all([
      this.expenseRepo.getAll(),
      this.statusRepo.getStatusesForMonths(months),
    ])

    let totalCents = 0
    let monthsWithData = 0

    for (const month of months) {
      const statuses = allStatuses.get(month.key) ?? new Map()
      const views = this.domainService.buildMonthView(allExpenses, month, statuses)
      const summary = this.domainService.computeSummary(views)

      if (summary.total > 0) {
        totalCents += summary.total
        monthsWithData++
      }
    }

    const averageInCents = monthsWithData > 0 ? Math.round(totalCents / monthsWithData) : 0

    return { averageInCents, monthsWithData }
  }
}
