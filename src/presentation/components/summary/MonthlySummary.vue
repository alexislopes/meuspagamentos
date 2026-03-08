<script setup lang="ts">
import type { MonthlySummaryDTO } from '../../../application/dto/MonthlySummaryDTO'
import SummaryCard from './SummaryCard.vue'

defineProps<{
  summary: MonthlySummaryDTO
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <SummaryCard
      label="Total"
      :amount-in-cents="summary.totalInCents"
      icon="i-lucide-wallet"
      color="primary"
    />
    <SummaryCard
      label="Pago"
      :amount-in-cents="summary.totalPaidInCents"
      icon="i-lucide-circle-check"
      color="success"
    />
    <SummaryCard
      label="Pendente"
      :amount-in-cents="summary.totalPendingInCents"
      icon="i-lucide-clock"
      color="warning"
    />
  </div>
</template>
