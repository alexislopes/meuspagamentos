<script setup lang="ts">
import { computed } from 'vue'
import { useCurrency } from '../../composables/useCurrency'

const props = defineProps<{
  label: string
  amountInCents: number
  icon: string
  color: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
}>()

const { formatCents } = useCurrency()

const colorClasses = computed(() => {
  const map: Record<string, { bg: string; text: string }> = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    error: { bg: 'bg-error/10', text: 'text-error' },
    neutral: { bg: 'bg-neutral/10', text: 'text-neutral' },
  }
  return map[props.color]
})
</script>

<template>
  <UCard>
    <div class="space-y-3">
      <div class="size-10 rounded-full flex items-center justify-center" :class="colorClasses.bg">
        <UIcon :name="icon" class="text-lg" :class="colorClasses.text" />
      </div>
      <div>
        <p class="text-sm text-dimmed">{{ label }}</p>
        <p class="text-2xl font-bold mt-1">{{ formatCents(amountInCents) }}</p>
      </div>
    </div>
  </UCard>
</template>
