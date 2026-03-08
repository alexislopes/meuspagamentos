import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useNavigationStore } from '../stores/useNavigationStore'
import { useExpenseStore } from '../stores/useExpenseStore'

export function useMonthNavigation() {
  const navigationStore = useNavigationStore()
  const expenseStore = useExpenseStore()
  const { currentMonth } = storeToRefs(navigationStore)

  watch(
    currentMonth,
    async () => {
      await expenseStore.refresh()
    },
    { immediate: true },
  )

  return {
    ...navigationStore,
    expenses: expenseStore.expenses,
    summary: expenseStore.summary,
  }
}
