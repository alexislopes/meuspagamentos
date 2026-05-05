<script setup lang="ts">
import { computed } from 'vue'
import { EntryStatus, type EntryKind } from '../../../domain/value-objects/EntryStatus'

const props = defineProps<{
  status: EntryStatus
  kind: EntryKind
}>()

const config = computed(() => {
  switch (props.status) {
    case EntryStatus.CONFIRMED:
      return {
        label: props.kind === 'income' ? 'Recebido' : 'Pago',
        color: 'success' as const,
      }
    case EntryStatus.SKIPPED:
      return { label: 'Pulado', color: 'neutral' as const }
    case EntryStatus.PENDING:
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
