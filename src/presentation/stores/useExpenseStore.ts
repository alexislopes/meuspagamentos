import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNavigationStore } from './useNavigationStore'
import type { MonthlyExpenseDTO } from '../../application/dto/MonthlyExpenseDTO'
import type { MonthlySummaryDTO } from '../../application/dto/MonthlySummaryDTO'
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
} from '../../infrastructure/container'

export const useExpenseStore = defineStore('expense', () => {
  const navigationStore = useNavigationStore()

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

  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      const month = navigationStore.currentMonth
      expenses.value = await getMonthlyExpenses.execute(month)
      summary.value = await getMonthlySummary.execute(month)
    } finally {
      loading.value = false
    }
  }

  async function addExpense(dto: CreateFixedExpenseDTO) {
    await createFixedExpense.execute(dto)
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
