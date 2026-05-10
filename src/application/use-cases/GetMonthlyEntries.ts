import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { MonthlyEntryService } from '../../domain/services/MonthlyEntryService'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import type { MonthlyEntryDTO } from '../dto/MonthlyEntryDTO'

export class GetMonthlyEntriesUseCase {
  private readonly domainService = new MonthlyEntryService()

  constructor(
    private readonly entryRepo: IEntryRepository,
    private readonly statusRepo: IEntryStatusRepository,
  ) {}

  async execute(month: YearMonth, context: ExpenseContext): Promise<MonthlyEntryDTO[]> {
    const allEntries = await this.entryRepo.getAll(context)
    const [statuses, snapshots] = await Promise.all([
      this.statusRepo.getStatusesForMonth(month),
      this.statusRepo.getSnapshotsForMonth(month),
    ])
    const views = this.domainService.buildMonthView(allEntries, month, statuses, snapshots)

    return views.map((v) => ({
      entryId: v.entryId,
      name: v.name,
      amountInCents: v.amount.inCents,
      dueDay: v.dueDay,
      kind: v.kind,
      status: v.status,
      valueType: v.valueType,
      formulaDescription: v.formulaDescription,
    }))
  }
}
