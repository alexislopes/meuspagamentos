<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ExpenseContext } from '../../../domain/value-objects/ExpenseContext'
import { useContextStore } from '../../stores/useContextStore'

const contextStore = useContextStore()
const { current } = storeToRefs(contextStore)

function isActive(ctx: ExpenseContext) {
  return current.value === ctx
}
</script>

<template>
  <div
    role="tablist"
    aria-label="Alternar entre Pessoa Física e Pessoa Jurídica"
    class="inline-flex items-center rounded-md border border-default bg-elevated p-0.5 gap-0.5"
  >
    <button
      type="button"
      role="tab"
      :aria-selected="isActive(ExpenseContext.PF)"
      :class="[
        'px-3 py-1 text-sm font-medium rounded-sm transition-colors',
        isActive(ExpenseContext.PF)
          ? 'bg-primary text-inverted shadow-sm'
          : 'text-toned hover:text-highlighted',
      ]"
      @click="contextStore.setContext(ExpenseContext.PF)"
    >
      PF
    </button>
    <button
      type="button"
      role="tab"
      :aria-selected="isActive(ExpenseContext.PJ)"
      :class="[
        'px-3 py-1 text-sm font-medium rounded-sm transition-colors',
        isActive(ExpenseContext.PJ)
          ? 'bg-primary text-inverted shadow-sm'
          : 'text-toned hover:text-highlighted',
      ]"
      @click="contextStore.setContext(ExpenseContext.PJ)"
    >
      PJ
    </button>
  </div>
</template>
