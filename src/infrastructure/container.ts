import { SupabaseEntryRepository } from './repositories/SupabaseEntryRepository'
import { SupabaseEntryStatusRepository } from './repositories/SupabaseEntryStatusRepository'
import { CreateEntryUseCase } from '../application/use-cases/CreateEntry'
import { UpdateEntryUseCase } from '../application/use-cases/UpdateEntry'
import { DeleteEntryUseCase } from '../application/use-cases/DeleteEntry'
import { ConfirmEntryUseCase } from '../application/use-cases/ConfirmEntry'
import { SkipEntryUseCase } from '../application/use-cases/SkipEntry'
import { RevertEntryStatusUseCase } from '../application/use-cases/RevertEntryStatus'
import { GetMonthlyEntriesUseCase } from '../application/use-cases/GetMonthlyEntries'
import { GetMonthlySummaryUseCase } from '../application/use-cases/GetMonthlySummary'
import { GetAverageMonthlyCostUseCase } from '../application/use-cases/GetAverageMonthlyCost'
import { GetAverageMonthlyIncomeUseCase } from '../application/use-cases/GetAverageMonthlyIncome'

const entryRepo = new SupabaseEntryRepository()
const statusRepo = new SupabaseEntryStatusRepository()

export const createEntry = new CreateEntryUseCase(entryRepo)
export const updateEntry = new UpdateEntryUseCase(entryRepo)
export const deleteEntry = new DeleteEntryUseCase(entryRepo)
export const confirmEntry = new ConfirmEntryUseCase(entryRepo, statusRepo)
export const skipEntry = new SkipEntryUseCase(statusRepo)
export const revertEntryStatus = new RevertEntryStatusUseCase(statusRepo)
export const getMonthlyEntries = new GetMonthlyEntriesUseCase(entryRepo, statusRepo)
export const getMonthlySummary = new GetMonthlySummaryUseCase(entryRepo, statusRepo)
export const getAverageMonthlyCost = new GetAverageMonthlyCostUseCase(entryRepo, statusRepo)
export const getAverageMonthlyIncome = new GetAverageMonthlyIncomeUseCase(entryRepo, statusRepo)
