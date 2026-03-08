<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlyExpenseDTO } from '../../../application/dto/MonthlyExpenseDTO'
import { ExpenseStatus } from '../../../domain/value-objects/ExpenseStatus'
import { useCurrency } from '../../composables/useCurrency'
import ExpenseCard from './ExpenseCard.vue'

const props = defineProps<{
  expenses: MonthlyExpenseDTO[]
}>()

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
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-sm font-semibold text-highlighted">1ª Quinzena</h3>
          <span class="text-sm text-dimmed">{{ formatCents(firstHalfTotal) }}</span>
        </div>
        <div class="space-y-3">
          <ExpenseCard
            v-for="expense in firstHalf"
            :key="expense.expenseId"
            :expense="expense"
          />
        </div>
      </section>

      <section v-if="secondHalf.length > 0">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-sm font-semibold text-highlighted">2ª Quinzena</h3>
          <span class="text-sm text-dimmed">{{ formatCents(secondHalfTotal) }}</span>
        </div>
        <div class="space-y-3">
          <ExpenseCard
            v-for="expense in secondHalf"
            :key="expense.expenseId"
            :expense="expense"
          />
        </div>
      </section>
    </template>

    <UCard v-else>
      <div class="text-center py-8 text-dimmed">
        <UIcon name="i-lucide-inbox" class="text-4xl mb-2" />
        <p>Nenhum gasto cadastrado para este mês.</p>
        <UButton
          label="Cadastrar gasto"
          variant="soft"
          class="mt-4"
          to="/expenses/new"
          icon="i-lucide-plus"
        />
      </div>
    </UCard>
  </div>
</template>
