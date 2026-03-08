import type { IFixedExpenseRepository } from '../../domain/repositories/IFixedExpenseRepository'
import type { YearMonth } from '../../domain/value-objects/YearMonth'

export class DeleteFixedExpenseUseCase {
  constructor(private readonly expenseRepo: IFixedExpenseRepository) {}

  async execute(expenseId: string, fromMonth: YearMonth): Promise<void> {
    const expense = await this.expenseRepo.getById(expenseId)
    if (!expense) {
      throw new Error(`Expense not found: ${expenseId}`)
    }
    expense.markDeletedFrom(fromMonth)
    await this.expenseRepo.update(expense)
  }
}
