<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlySummaryDTO } from '../../../application/dto/MonthlySummaryDTO'
import { useCurrency } from '../../composables/useCurrency'

const props = defineProps<{
  summary: MonthlySummaryDTO
}>()

const { formatCents } = useCurrency()

const balanceIsPositive = computed(() => props.summary.balanceInCents >= 0)
const balanceFormatted = computed(() => {
  const cents = Math.abs(props.summary.balanceInCents)
  const sign = props.summary.balanceInCents > 0 ? '+ ' : props.summary.balanceInCents < 0 ? '− ' : ''
  return `${sign}${formatCents(cents)}`
})

const totalCount = computed(() => props.summary.confirmedCount + props.summary.pendingCount)
const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((props.summary.confirmedCount / totalCount.value) * 100)
})
const allConfirmed = computed(() => totalCount.value > 0 && props.summary.pendingCount === 0)
</script>

<template>
  <div class="rounded-xl border border-muted bg-elevated p-5 space-y-5">
    <!-- Saldo -->
    <div>
      <p class="text-xs font-medium text-dimmed uppercase tracking-wider">Saldo do mês</p>
      <p
        class="text-3xl font-bold tracking-tight mt-1 tabular-nums"
        :class="balanceIsPositive ? 'text-success' : 'text-warning'"
      >
        {{ balanceFormatted }}
      </p>
    </div>

    <!-- Entradas / Saídas -->
    <div class="grid grid-cols-2 gap-3 pt-1 border-t border-muted">
      <div>
        <p class="text-xs text-dimmed flex items-center gap-1">
          <UIcon name="i-lucide-arrow-down-left" class="text-success" />
          Entradas
        </p>
        <p class="text-base font-semibold text-success tabular-nums mt-0.5">
          {{ formatCents(summary.totalIncomeInCents) }}
        </p>
      </div>
      <div class="text-right">
        <p class="text-xs text-dimmed flex items-center gap-1 justify-end">
          <UIcon name="i-lucide-arrow-up-right" class="text-warning" />
          Saídas
        </p>
        <p class="text-base font-semibold text-warning tabular-nums mt-0.5">
          {{ formatCents(summary.totalExpenseInCents) }}
        </p>
      </div>
    </div>

    <!-- Progress thermometer (confirmed vs pending across all kinds) -->
    <div v-if="totalCount > 0" class="space-y-2 pt-3 border-t border-muted">
      <div class="h-2 rounded-full bg-accented overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :class="allConfirmed ? 'bg-success' : 'bg-primary'"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <div class="flex justify-between text-xs text-muted">
        <span>{{ summary.confirmedCount }} de {{ totalCount }} confirmados</span>
        <span class="tabular-nums">{{ progressPercent }}%</span>
      </div>
    </div>
  </div>
</template>
