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
    <MonthlySummary :summary="summary" />
    <ExpenseList :expenses="expenses" />
  </div>
</template>
