<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlyExpenseDTO } from '../../../application/dto/MonthlyExpenseDTO'
import { ExpenseStatus } from '../../../domain/value-objects/ExpenseStatus'
import { useCurrency } from '../../composables/useCurrency'
import ExpenseCard from './ExpenseCard.vue'
import { useCreateExpense } from '../../composables/useCreateExpense'

const props = defineProps<{
  expenses: MonthlyExpenseDTO[]
}>()

const { open: openCreateSlideover } = useCreateExpense()

const { formatCents } = useCurrency()

const firstHalf = computed(() =>
  props.expenses.filter((e) => e.dueDay <= 15),
)

const secondHalf = computed(() =>
  props.expenses.filter((e) => e.dueDay > 15),
)

function sumCents(items: MonthlyExpenseDTO[]): number {
  return items
    .filter((e) => e.status !== ExpenseStatus.SKIPPED)
    .reduce((sum, e) => sum + e.amountInCents, 0)
}

const firstHalfTotal = computed(() => sumCents(firstHalf.value))
const secondHalfTotal = computed(() => sumCents(secondHalf.value))
</script>

<template>
  <div class="space-y-6">
    <template v-if="expenses.length > 0">
      <section v-if="firstHalf.length > 0">
        <div class="flex items-center gap-3 mb-3">
          <h3 class="text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">1ª Quinzena</h3>
          <div class="flex-1 border-b border-muted" />
          <span class="text-xs font-medium text-dimmed tabular-nums">{{ formatCents(firstHalfTotal) }}</span>
        </div>
        <div class="space-y-2">
          <ExpenseCard
            v-for="expense in firstHalf"
            :key="expense.expenseId"
            :expense="expense"
          />
        </div>
      </section>

      <section v-if="secondHalf.length > 0">
        <div class="flex items-center gap-3 mb-3">
          <h3 class="text-xs font-semibold text-muted uppercase tracking-wider whitespace-nowrap">2ª Quinzena</h3>
          <div class="flex-1 border-b border-muted" />
          <span class="text-xs font-medium text-dimmed tabular-nums">{{ formatCents(secondHalfTotal) }}</span>
        </div>
        <div class="space-y-2">
          <ExpenseCard
            v-for="expense in secondHalf"
            :key="expense.expenseId"
            :expense="expense"
          />
        </div>
      </section>
    </template>

    <div v-else class="text-center py-16 text-muted">
      <UIcon name="i-lucide-notebook-pen" class="text-5xl mb-3 opacity-40" />
      <p class="text-base font-medium text-toned mb-1">Nenhum gasto cadastrado</p>
      <p class="text-sm mb-5">Comece adicionando seus gastos fixos mensais.</p>
      <UButton
        label="Adicionar primeiro gasto"
        icon="i-lucide-plus"
        @click="openCreateSlideover()"
      />
    </div>
  </div>
</template>
