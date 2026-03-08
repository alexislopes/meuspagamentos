import type { IFixedExpenseRepository } from '../../domain/repositories/IFixedExpenseRepository'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { UpdateFixedExpenseDTO } from '../dto/UpdateFixedExpenseDTO'

export class UpdateFixedExpenseUseCase {
  constructor(private readonly expenseRepo: IFixedExpenseRepository) {}

  async execute(dto: UpdateFixedExpenseDTO): Promise<void> {
    const expense = await this.expenseRepo.getById(dto.expenseId)
    if (!expense) {
      throw new Error(`Expense not found: ${dto.expenseId}`)
    }

    const fromMonth = YearMonth.fromKey(dto.effectiveFromMonth)
    const amount = Money.fromDecimal(dto.amount)

    expense.addRevision(fromMonth, dto.name, amount, dto.dueDay)
    await this.expenseRepo.update(expense)
  }
}
