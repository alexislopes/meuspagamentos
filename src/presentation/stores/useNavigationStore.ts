import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { YearMonth } from '../../domain/value-objects/YearMonth'

export const useNavigationStore = defineStore('navigation', () => {
  const currentMonth = ref<YearMonth>(YearMonth.current())

  const monthLabel = computed(() => {
    const date = new Date(currentMonth.value.year, currentMonth.value.month - 1)
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  })

  const isCurrentMonth = computed(() =>
    currentMonth.value.equals(YearMonth.current()),
  )

  function goToPreviousMonth() {
    currentMonth.value = currentMonth.value.previous()
  }

  function goToNextMonth() {
    currentMonth.value = currentMonth.value.next()
  }

  function goToCurrentMonth() {
    currentMonth.value = YearMonth.current()
  }

  return {
    currentMonth,
    monthLabel,
    isCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  }
})
