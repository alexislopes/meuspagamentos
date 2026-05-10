import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { MonthlyEntryService } from '../../domain/services/MonthlyEntryService'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { AverageMonthlyIncomeDTO } from '../dto/AverageMonthlyIncomeDTO'

export class GetAverageMonthlyIncomeUseCase {
  private readonly domainService = new MonthlyEntryService()

  constructor(
    private readonly entryRepo: IEntryRepository,
    private readonly statusRepo: IEntryStatusRepository,
  ) {}

  async execute(context: ExpenseContext): Promise<AverageMonthlyIncomeDTO> {
    const current = YearMonth.current()

    const months: YearMonth[] = []
    let m = current
    for (let i = 0; i < 12; i++) {
      months.unshift(m)
      m = m.previous()
    }

    const [allEntries, allStatuses] = await Promise.all([
      this.entryRepo.getAll(context),
      this.statusRepo.getStatusesForMonths(months),
    ])

    let totalCents = 0
    let monthsWithData = 0

    for (const month of months) {
      const statuses = allStatuses.get(month.key) ?? new Map()
      const snapshots = await this.statusRepo.getSnapshotsForMonth(month)
      const views = this.domainService.buildMonthView(allEntries, month, statuses, snapshots)
      const summary = this.domainService.computeSummary(views)

      if (summary.totalIncome > 0) {
        totalCents += summary.totalIncome
        monthsWithData++
      }
    }

    const averageInCents = monthsWithData > 0 ? Math.round(totalCents / monthsWithData) : 0

    return { averageInCents, monthsWithData }
  }
}
