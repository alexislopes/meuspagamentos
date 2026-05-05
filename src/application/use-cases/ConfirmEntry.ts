import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { EntryStatus } from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'

export class ConfirmEntryUseCase {
  constructor(private readonly statusRepo: IEntryStatusRepository) {}

  async execute(month: YearMonth, entryId: string): Promise<void> {
    await this.statusRepo.setStatus(month, entryId, EntryStatus.CONFIRMED)
  }
}
