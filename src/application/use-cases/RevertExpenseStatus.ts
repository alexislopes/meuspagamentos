import type { IExpenseStatusRepository } from '../../domain/repositories/IExpenseStatusRepository'
import type { YearMonth } from '../../domain/value-objects/YearMonth'

export class RevertExpenseStatusUseCase {
  constructor(private readonly statusRepo: IExpenseStatusRepository) {}

  async execute(month: YearMonth, expenseId: string): Promise<void> {
    await this.statusRepo.removeStatus(month, expenseId)
  }
}
