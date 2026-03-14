<script setup lang="ts">
import { useMonthNavigation } from '../composables/useMonthNavigation'
import MonthNavigator from '../components/navigation/MonthNavigator.vue'
import MonthlySummary from '../components/summary/MonthlySummary.vue'
import ExpenseList from '../components/expense/ExpenseList.vue'
import { useExpenseStore } from '../stores/useExpenseStore'
import { storeToRefs } from 'pinia'

useMonthNavigation()

const expenseStore = useExpenseStore()
const { expenses, summary } = storeToRefs(expenseStore)
</script>

<template>
  <div class="space-y-6">
    <MonthNavigator />

    <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      <!-- Sidebar: summary sticky on desktop -->
      <aside class="lg:sticky lg:top-6">
        <MonthlySummary :summary="summary" />
      </aside>

      <!-- Main: expense list -->
      <section>
        <ExpenseList :expenses="expenses" />
      </section>
    </div>
  </div>
</template>
