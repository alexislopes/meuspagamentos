import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { UpdateEntryDTO } from '../dto/UpdateEntryDTO'

export class UpdateEntryUseCase {
  constructor(private readonly entryRepo: IEntryRepository) {}

  async execute(dto: UpdateEntryDTO): Promise<void> {
    const entry = await this.entryRepo.getById(dto.entryId)
    if (!entry) {
      throw new Error(`Entry not found: ${dto.entryId}`)
    }

    const fromMonth = YearMonth.fromKey(dto.effectiveFromMonth)
    const amount = Money.fromDecimal(dto.amount)

    entry.addRevision(fromMonth, dto.name, amount, dto.dueDay)
    await this.entryRepo.update(entry)
  }
}
