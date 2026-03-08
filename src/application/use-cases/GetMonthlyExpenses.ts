import type { IFixedExpenseRepository } from '../../domain/repositories/IFixedExpenseRepository'
import type { IExpenseStatusRepository } from '../../domain/repositories/IExpenseStatusRepository'
import { MonthlyExpenseService } from '../../domain/services/MonthlyExpenseService'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import type { MonthlyExpenseDTO } from '../dto/MonthlyExpenseDTO'

export class GetMonthlyExpensesUseCase {
  private readonly domainService = new MonthlyExpenseService()

  constructor(
    private readonly expenseRepo: IFixedExpenseRepository,
    private readonly statusRepo: IExpenseStatusRepository,
  ) {}

  async execute(month: YearMonth): Promise<MonthlyExpenseDTO[]> {
    const allExpenses = await this.expenseRepo.getAll()
    const statuses = await this.statusRepo.getStatusesForMonth(month)
    const views = this.domainService.buildMonthView(allExpenses, month, statuses)

    return views.map((v) => ({
      expenseId: v.expenseId,
      name: v.name,
      amountInCents: v.amount.inCents,
      dueDay: v.dueDay,
      status: v.status,
    }))
  }
}
