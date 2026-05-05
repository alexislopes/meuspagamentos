import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { YearMonth } from '../../domain/value-objects/YearMonth'

export class DeleteEntryUseCase {
  constructor(private readonly entryRepo: IEntryRepository) {}

  async execute(entryId: string, fromMonth: YearMonth): Promise<void> {
    const entry = await this.entryRepo.getById(entryId)
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`)
    }
    entry.markDeletedFrom(fromMonth)
    await this.entryRepo.update(entry)
  }
}
