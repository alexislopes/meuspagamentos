import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { YearMonth } from '../../domain/value-objects/YearMonth'

export const useNavigationStore = defineStore('navigation', () => {
  const currentMonth = ref<YearMonth>(YearMonth.current())

  const monthLabel = computed(() => {
    const date = new Date(currentMonth.value.year, currentMonth.value.month - 1)
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  })

  const monthName = computed(() => {
    const date = new Date(currentMonth.value.year, currentMonth.value.month - 1)
    return date.toLocaleDateString('pt-BR', { month: 'long' })
  })

  const yearLabel = computed(() => currentMonth.value.year.toString())

  const isCurrentMonth = computed(() =>
    currentMonth.value.equals(YearMonth.current()),
  )

  const relativeLabel = computed(() => {
    const now = YearMonth.current()
    const diff = (currentMonth.value.year - now.year) * 12 + (currentMonth.value.month - now.month)
    if (diff === 0) return null
    if (diff === -1) return 'Mês passado'
    if (diff === 1) return 'Próximo mês'
    if (diff < -1) return `Há ${Math.abs(diff)} meses`
    return `Daqui ${diff} meses`
  })

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
    monthName,
    yearLabel,
    isCurrentMonth,
    relativeLabel,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  }
})
