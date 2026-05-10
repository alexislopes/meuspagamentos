import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { MonthlyEntryService } from '../../domain/services/MonthlyEntryService'
import {
  EntryStatus,
  EntryValueType,
} from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'

export class ConfirmEntryUseCase {
  private readonly service = new MonthlyEntryService()

  constructor(
    private readonly entryRepo: IEntryRepository,
    private readonly statusRepo: IEntryStatusRepository,
  ) {}

  async execute(month: YearMonth, entryId: string): Promise<void> {
    const target = await this.entryRepo.getById(entryId)
    if (!target) throw new Error(`Entry not found: ${entryId}`)

    if (target.valueType === EntryValueType.FIXED) {
      await this.statusRepo.setStatus(month, entryId, EntryStatus.CONFIRMED)
      return
    }

    const allInContext = await this.entryRepo.getAll(target.context)
    const [statuses, snapshots] = await Promise.all([
      this.statusRepo.getStatusesForMonth(month),
      this.statusRepo.getSnapshotsForMonth(month),
    ])
    const views = this.service.buildMonthView(allInContext, month, statuses, snapshots)
    const targetView = views.find((v) => v.entryId === entryId)
    if (!targetView) throw new Error(`Relative entry not active in month: ${entryId}`)
    await this.statusRepo.setStatus(
      month,
      entryId,
      EntryStatus.CONFIRMED,
      targetView.amount.inCents,
    )
  }
}
