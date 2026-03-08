<script setup lang="ts">
import { useCurrency } from '../../composables/useCurrency'

defineProps<{
  label: string
  amountInCents: number
  icon: string
  color: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
}>()

const { formatCents } = useCurrency()
</script>

<template>
  <UCard class="flex-1">
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <p class="text-sm text-[var(--ui-text-dimmed)]">{{ label }}</p>
        <p class="text-2xl font-bold mt-1">{{ formatCents(amountInCents) }}</p>
      </div>
      <UIcon :name="icon" class="text-2xl" :class="`text-[var(--ui-${color})]`" />
    </div>
  </UCard>
</template>
