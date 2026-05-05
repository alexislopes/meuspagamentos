<script setup lang="ts">
import type { AverageMonthlyIncomeDTO } from '../../../application/dto/AverageMonthlyIncomeDTO'
import { useCurrency } from '../../composables/useCurrency'

defineProps<{
  data: AverageMonthlyIncomeDTO
}>()

const { formatCents } = useCurrency()
</script>

<template>
  <div class="rounded-xl border border-muted bg-elevated px-5 py-4 flex items-baseline justify-between gap-4">
    <div>
      <p class="text-sm font-medium text-highlighted flex items-center gap-1">
        <UIcon name="i-lucide-arrow-down-left" class="text-success" />
        Receita média mensal
      </p>
      <p class="text-xs text-dimmed mt-0.5">
        Baseado nos últimos {{ data.monthsWithData }} {{ data.monthsWithData === 1 ? 'mês' : 'meses' }} com receita
      </p>
    </div>
    <p class="text-xl font-semibold text-success tabular-nums tracking-tight shrink-0">
      {{ formatCents(data.averageInCents) }}
    </p>
  </div>
</template>
