import { ref } from 'vue'

const showCreateSlideover = ref(false)

export function useCreateExpense() {
  function open() {
    showCreateSlideover.value = true
  }

  function close() {
    showCreateSlideover.value = false
  }

  return {
    showCreateSlideover,
    open,
    close,
  }
}
