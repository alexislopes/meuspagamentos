import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import type { YearMonth } from '../../domain/value-objects/YearMonth'

export class RevertEntryStatusUseCase {
  constructor(private readonly statusRepo: IEntryStatusRepository) {}

  async execute(month: YearMonth, entryId: string): Promise<void> {
    await this.statusRepo.removeStatus(month, entryId)
  }
}
