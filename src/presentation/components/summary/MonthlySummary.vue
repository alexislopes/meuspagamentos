<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlySummaryDTO } from '../../../application/dto/MonthlySummaryDTO'
import { useCurrency } from '../../composables/useCurrency'

const props = defineProps<{
  summary: MonthlySummaryDTO
}>()

const { formatCents } = useCurrency()

const totalCount = computed(() => props.summary.paidCount + props.summary.pendingCount)

const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((props.summary.paidCount / totalCount.value) * 100)
})

const allPaid = computed(() => totalCount.value > 0 && props.summary.pendingCount === 0)
</script>

<template>
  <div class="rounded-xl border border-muted bg-elevated p-5 space-y-5">
    <!-- Total -->
    <div>
      <p class="text-xs font-medium text-dimmed uppercase tracking-wider">Total do mês</p>
      <p class="text-3xl font-bold text-highlighted tracking-tight mt-1">
        {{ formatCents(summary.totalInCents) }}
      </p>
    </div>

    <!-- Progress thermometer -->
    <div v-if="summary.expenseCount > 0" class="space-y-2">
      <div class="h-2 rounded-full bg-accented overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :class="allPaid ? 'bg-success' : 'bg-primary'"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <div class="flex justify-between text-xs text-muted">
        <span>{{ summary.paidCount }} de {{ totalCount }} pagos</span>
        <span class="tabular-nums">{{ progressPercent }}%</span>
      </div>
    </div>

    <!-- Paid / Pending breakdown -->
    <div class="grid grid-cols-2 gap-3 pt-1 border-t border-muted">
      <div>
        <p class="text-xs text-dimmed">Pago</p>
        <p class="text-base font-semibold text-success tabular-nums mt-0.5">
          {{ formatCents(summary.totalPaidInCents) }}
        </p>
      </div>
      <div class="text-right">
        <p class="text-xs text-dimmed">Pendente</p>
        <p class="text-base font-semibold tabular-nums mt-0.5" :class="allPaid ? 'text-success' : 'text-warning'">
          {{ allPaid ? 'Tudo pago' : formatCents(summary.totalPendingInCents) }}
        </p>
      </div>
    </div>
  </div>
</template>
