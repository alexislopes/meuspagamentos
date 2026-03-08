import { FixedExpense } from '../../domain/entities/FixedExpense'
import type { IFixedExpenseRepository } from '../../domain/repositories/IFixedExpenseRepository'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { CreateFixedExpenseDTO } from '../dto/CreateFixedExpenseDTO'

export class CreateFixedExpenseUseCase {
  constructor(private readonly expenseRepo: IFixedExpenseRepository) {}

  async execute(dto: CreateFixedExpenseDTO): Promise<FixedExpense> {
    const expense = new FixedExpense({
      id: crypto.randomUUID(),
      name: dto.name,
      amount: Money.fromDecimal(dto.amount),
      dueDay: dto.dueDay,
      createdAt: YearMonth.current(),
      deletedFromMonth: null,
    })
    await this.expenseRepo.save(expense)
    return expense
  }
}
