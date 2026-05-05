import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useNavigationStore } from '../stores/useNavigationStore'
import { useEntryStore } from '../stores/useEntryStore'

export function useMonthNavigation() {
  const navigationStore = useNavigationStore()
  const entryStore = useEntryStore()
  const { currentMonth } = storeToRefs(navigationStore)

  watch(
    currentMonth,
    async () => {
      await entryStore.refresh()
    },
    { immediate: true },
  )

  return {
    ...navigationStore,
    entries: entryStore.entries,
    summary: entryStore.summary,
  }
}
