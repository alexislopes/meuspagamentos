<script setup lang="ts">
import { computed } from 'vue'
import { ExpenseStatus } from '../../../domain/value-objects/ExpenseStatus'

const props = defineProps<{
  status: ExpenseStatus
}>()

const config = computed(() => {
  switch (props.status) {
    case ExpenseStatus.PAID:
      return { label: 'Pago', color: 'success' as const }
    case ExpenseStatus.SKIPPED:
      return { label: 'Pulado', color: 'neutral' as const }
    case ExpenseStatus.PENDING:
    default:
      return { label: 'Pendente', color: 'warning' as const }
  }
})
</script>

<template>
  <UBadge :color="config.color" variant="subtle" size="sm">
    {{ config.label }}
  </UBadge>
</template>
