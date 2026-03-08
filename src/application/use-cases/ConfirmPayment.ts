import type { IExpenseStatusRepository } from '../../domain/repositories/IExpenseStatusRepository'
import { ExpenseStatus } from '../../domain/value-objects/ExpenseStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'

export class ConfirmPaymentUseCase {
  constructor(private readonly statusRepo: IExpenseStatusRepository) {}

  async execute(month: YearMonth, expenseId: string): Promise<void> {
    await this.statusRepo.setStatus(month, expenseId, ExpenseStatus.PAID)
  }
}
