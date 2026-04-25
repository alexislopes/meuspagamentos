import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useNavigationStore } from './useNavigationStore'
import { useContextStore } from './useContextStore'
import type { MonthlyExpenseDTO } from '../../application/dto/MonthlyExpenseDTO'
import type { MonthlySummaryDTO } from '../../application/dto/MonthlySummaryDTO'
import type { AverageMonthlyCostDTO } from '../../application/dto/AverageMonthlyCostDTO'
import type { CreateFixedExpenseDTO } from '../../application/dto/CreateFixedExpenseDTO'
import type { UpdateFixedExpenseDTO } from '../../application/dto/UpdateFixedExpenseDTO'
import {
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  confirmPayment,
  skipExpense,
  revertExpenseStatus,
  getMonthlyExpenses,
  getMonthlySummary,
  getAverageMonthlyCost,
} from '../../infrastructure/container'

export const useExpenseStore = defineStore('expense', () => {
  const navigationStore = useNavigationStore()
  const contextStore = useContextStore()

  const expenses = ref<MonthlyExpenseDTO[]>([])
  const summary = ref<MonthlySummaryDTO>({
    totalInCents: 0,
    totalPaidInCents: 0,
    totalPendingInCents: 0,
    expenseCount: 0,
    paidCount: 0,
    pendingCount: 0,
    skippedCount: 0,
  })

  const averageMonthlyCost = ref<AverageMonthlyCostDTO | null>(null)

  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      const month = navigationStore.currentMonth
      const context = contextStore.current
      const [expensesResult, summaryResult, averageResult] = await Promise.all([
        getMonthlyExpenses.execute(month, context),
        getMonthlySummary.execute(month, context),
        getAverageMonthlyCost.execute(context),
      ])
      expenses.value = expensesResult
      summary.value = summaryResult
      averageMonthlyCost.value = averageResult
    } finally {
      loading.value = false
    }
  }

  watch(() => contextStore.current, () => {
    refresh()
  })

  async function addExpense(dto: Omit<CreateFixedExpenseDTO, 'context'>) {
    await createFixedExpense.execute({ ...dto, context: contextStore.current })
    await refresh()
  }

  async function editExpense(dto: Omit<UpdateFixedExpenseDTO, 'effectiveFromMonth'>) {
    const month = navigationStore.currentMonth
    await updateFixedExpense.execute({
      ...dto,
      effectiveFromMonth: month.key,
    })
    await refresh()
  }

  async function removeExpense(expenseId: string) {
    const month = navigationStore.currentMonth
    await deleteFixedExpense.execute(expenseId, month)
    await refresh()
  }

  async function markAsPaid(expenseId: string) {
    const month = navigationStore.currentMonth
    await confirmPayment.execute(month, expenseId)
    await refresh()
  }

  async function markAsSkipped(expenseId: string) {
    const month = navigationStore.currentMonth
    await skipExpense.execute(month, expenseId)
    await refresh()
  }

  async function revertStatus(expenseId: string) {
    const month = navigationStore.currentMonth
    await revertExpenseStatus.execute(month, expenseId)
    await refresh()
  }

  return {
    expenses,
    summary,
    averageMonthlyCost,
    loading,
    refresh,
    addExpense,
    editExpense,
    removeExpense,
    markAsPaid,
    markAsSkipped,
    revertStatus,
  }
})
