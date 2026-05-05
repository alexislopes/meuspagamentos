import { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { CreateEntryDTO } from '../dto/CreateEntryDTO'

export class CreateEntryUseCase {
  constructor(private readonly entryRepo: IEntryRepository) {}

  async execute(dto: CreateEntryDTO): Promise<Entry> {
    const entry = new Entry({
      id: crypto.randomUUID(),
      name: dto.name,
      amount: Money.fromDecimal(dto.amount),
      dueDay: dto.dueDay,
      kind: dto.kind,
      recurrence: dto.recurrence,
      createdAt: YearMonth.current(),
      deletedFromMonth: null,
      context: dto.context,
    })
    await this.entryRepo.save(entry)
    return entry
  }
}
