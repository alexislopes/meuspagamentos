import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useNavigationStore } from './useNavigationStore'
import { useContextStore } from './useContextStore'
import type { MonthlyEntryDTO } from '../../application/dto/MonthlyEntryDTO'
import type { MonthlySummaryDTO } from '../../application/dto/MonthlySummaryDTO'
import type { AverageMonthlyCostDTO } from '../../application/dto/AverageMonthlyCostDTO'
import type { AverageMonthlyIncomeDTO } from '../../application/dto/AverageMonthlyIncomeDTO'
import type { CreateEntryDTO } from '../../application/dto/CreateEntryDTO'
import type { UpdateEntryDTO } from '../../application/dto/UpdateEntryDTO'
import {
  createEntry,
  updateEntry,
  deleteEntry,
  confirmEntry,
  skipEntry,
  revertEntryStatus,
  getMonthlyEntries,
  getMonthlySummary,
  getAverageMonthlyCost,
  getAverageMonthlyIncome,
} from '../../infrastructure/container'

export const useEntryStore = defineStore('entry', () => {
  const navigationStore = useNavigationStore()
  const contextStore = useContextStore()

  const entries = ref<MonthlyEntryDTO[]>([])
  const summary = ref<MonthlySummaryDTO>({
    totalIncomeInCents: 0,
    totalExpenseInCents: 0,
    confirmedIncomeInCents: 0,
    pendingIncomeInCents: 0,
    confirmedExpenseInCents: 0,
    pendingExpenseInCents: 0,
    balanceInCents: 0,
    incomeCount: 0,
    expenseCount: 0,
    confirmedCount: 0,
    pendingCount: 0,
    skippedCount: 0,
  })

  const averageMonthlyCost = ref<AverageMonthlyCostDTO | null>(null)
  const averageMonthlyIncome = ref<AverageMonthlyIncomeDTO | null>(null)

  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      const month = navigationStore.currentMonth
      const context = contextStore.current
      const [entriesResult, summaryResult, avgCost, avgIncome] = await Promise.all([
        getMonthlyEntries.execute(month, context),
        getMonthlySummary.execute(month, context),
        getAverageMonthlyCost.execute(context),
        getAverageMonthlyIncome.execute(context),
      ])
      entries.value = entriesResult
      summary.value = summaryResult
      averageMonthlyCost.value = avgCost
      averageMonthlyIncome.value = avgIncome
    } finally {
      loading.value = false
    }
  }

  watch(() => contextStore.current, () => {
    refresh()
  })

  async function addEntry(dto: Omit<CreateEntryDTO, 'context'>) {
    await createEntry.execute({ ...dto, context: contextStore.current })
    await refresh()
  }

  async function editEntry(dto: Omit<UpdateEntryDTO, 'effectiveFromMonth'>) {
    const month = navigationStore.currentMonth
    await updateEntry.execute({
      ...dto,
      effectiveFromMonth: month.key,
    })
    await refresh()
  }

  async function removeEntry(entryId: string) {
    const month = navigationStore.currentMonth
    await deleteEntry.execute(entryId, month)
    await refresh()
  }

  async function markAsConfirmed(entryId: string) {
    const month = navigationStore.currentMonth
    await confirmEntry.execute(month, entryId)
    await refresh()
  }

  async function markAsSkipped(entryId: string) {
    const month = navigationStore.currentMonth
    await skipEntry.execute(month, entryId)
    await refresh()
  }

  async function revertStatus(entryId: string) {
    const month = navigationStore.currentMonth
    await revertEntryStatus.execute(month, entryId)
    await refresh()
  }

  return {
    entries,
    summary,
    averageMonthlyCost,
    averageMonthlyIncome,
    loading,
    refresh,
    addEntry,
    editEntry,
    removeEntry,
    markAsConfirmed,
    markAsSkipped,
    revertStatus,
  }
})
