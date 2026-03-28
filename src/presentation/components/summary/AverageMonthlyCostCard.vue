<script setup lang="ts">
import type { AverageMonthlyCostDTO } from '../../../application/dto/AverageMonthlyCostDTO'
import { useCurrency } from '../../composables/useCurrency'

defineProps<{
  data: AverageMonthlyCostDTO
}>()

const { formatCents } = useCurrency()
</script>

<template>
  <div class="rounded-xl border border-muted bg-elevated px-5 py-4 flex items-baseline justify-between gap-4">
    <div>
      <p class="text-sm font-medium text-highlighted">Custo médio mensal</p>
      <p class="text-xs text-dimmed mt-0.5">
        Baseado nos últimos {{ data.monthsWithData }} {{ data.monthsWithData === 1 ? 'mês' : 'meses' }} com dados
      </p>
    </div>
    <p class="text-xl font-semibold text-highlighted tabular-nums tracking-tight shrink-0">
      {{ formatCents(data.averageInCents) }}
    </p>
  </div>
</template>
