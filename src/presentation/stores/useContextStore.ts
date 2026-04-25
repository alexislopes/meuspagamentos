import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'

export const useContextStore = defineStore('context', () => {
  const current = useLocalStorage<ExpenseContext>('mp.context', ExpenseContext.PF)

  function setContext(ctx: ExpenseContext) {
    current.value = ctx
  }

  return {
    current,
    setContext,
  }
})
