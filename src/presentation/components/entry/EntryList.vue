<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlyEntryDTO } from '../../../application/dto/MonthlyEntryDTO'
import { EntryStatus } from '../../../domain/value-objects/EntryStatus'
import { useCurrency } from '../../composables/useCurrency'
import EntryCard from './EntryCard.vue'
import { useCreateEntry } from '../../composables/useCreateEntry'

const props = defineProps<{
  entries: MonthlyEntryDTO[]
}>()

const { open: openCreateSlideover } = useCreateEntry()
const { formatCents } = useCurrency()

const firstHalf = computed(() =>
  props.entries.filter((e) => e.dueDay <= 15),
)

const secondHalf = computed(() =>
  props.entries.filter((e) => e.dueDay > 15),
)

function netCents(items: MonthlyEntryDTO[]): number {
  return items
    .filter((e) => e.status !== EntryStatus.SKIPPED)
    .reduce((sum, e) => sum + (e.kind === 'income' ? e.amountInCents : -e.amountInCents), 0)
}

const firstHalfNet = computed(() => netCents(firstHalf.value))
const secondHalfNet = computed(() => netCents(secondHalf.value))

function formatSigned(cents: number): string {
  if (cents === 0) return formatCents(0)
  const sign = cents > 0 ? '+' : '−'
  return `${sign} ${formatCents(Math.abs(cents))}`
}
</script>

<template>
  <div class="space-y-6">
    <template v-if="entries.length > 0">
      <section v-if="firstHalf.length > 0">
        <div class="flex items-center gap-3 mb-3">
          <h3 class="text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">1ª Quinzena</h3>
          <div class="flex-1 border-b border-muted" />
          <span
            class="text-xs font-medium tabular-nums"
            :class="firstHalfNet >= 0 ? 'text-success' : 'text-warning'"
          >{{ formatSigned(firstHalfNet) }}</span>
        </div>
        <div class="space-y-2">
          <EntryCard
            v-for="entry in firstHalf"
            :key="entry.entryId"
            :entry="entry"
          />
        </div>
      </section>

      <section v-if="secondHalf.length > 0">
        <div class="flex items-center gap-3 mb-3">
          <h3 class="text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">2ª Quinzena</h3>
          <div class="flex-1 border-b border-muted" />
          <span
            class="text-xs font-medium tabular-nums"
            :class="secondHalfNet >= 0 ? 'text-success' : 'text-warning'"
          >{{ formatSigned(secondHalfNet) }}</span>
        </div>
        <div class="space-y-2">
          <EntryCard
            v-for="entry in secondHalf"
            :key="entry.entryId"
            :entry="entry"
          />
        </div>
      </section>
    </template>

    <div v-else class="text-center py-16 text-muted">
      <UIcon name="i-lucide-notebook-pen" class="text-5xl mb-3 opacity-40" />
      <p class="text-base font-medium text-toned mb-1">Nenhum lançamento neste mês</p>
      <p class="text-sm mb-5">Adicione gastos fixos e receitas para acompanhar o mês.</p>
      <UButton
        label="Adicionar lançamento"
        icon="i-lucide-plus"
        @click="openCreateSlideover()"
      />
    </div>
  </div>
</template>
