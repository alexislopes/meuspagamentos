import { SupabaseFixedExpenseRepository } from './repositories/SupabaseFixedExpenseRepository'
import { SupabaseExpenseStatusRepository } from './repositories/SupabaseExpenseStatusRepository'
import { CreateFixedExpenseUseCase } from '../application/use-cases/CreateFixedExpense'
import { UpdateFixedExpenseUseCase } from '../application/use-cases/UpdateFixedExpense'
import { DeleteFixedExpenseUseCase } from '../application/use-cases/DeleteFixedExpense'
import { ConfirmPaymentUseCase } from '../application/use-cases/ConfirmPayment'
import { SkipExpenseUseCase } from '../application/use-cases/SkipExpense'
import { RevertExpenseStatusUseCase } from '../application/use-cases/RevertExpenseStatus'
import { GetMonthlyExpensesUseCase } from '../application/use-cases/GetMonthlyExpenses'
import { GetMonthlySummaryUseCase } from '../application/use-cases/GetMonthlySummary'

const expenseRepo = new SupabaseFixedExpenseRepository()
const statusRepo = new SupabaseExpenseStatusRepository()

export const createFixedExpense = new CreateFixedExpenseUseCase(expenseRepo)
export const updateFixedExpense = new UpdateFixedExpenseUseCase(expenseRepo)
export const deleteFixedExpense = new DeleteFixedExpenseUseCase(expenseRepo)
export const confirmPayment = new ConfirmPaymentUseCase(statusRepo)
export const skipExpense = new SkipExpenseUseCase(statusRepo)
export const revertExpenseStatus = new RevertExpenseStatusUseCase(statusRepo)
export const getMonthlyExpenses = new GetMonthlyExpensesUseCase(expenseRepo, statusRepo)
export const getMonthlySummary = new GetMonthlySummaryUseCase(expenseRepo, statusRepo)
