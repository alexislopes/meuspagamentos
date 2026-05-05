<script setup lang="ts">
import { useMonthNavigation } from '../composables/useMonthNavigation'
import MonthNavigator from '../components/navigation/MonthNavigator.vue'
import MonthlySummary from '../components/summary/MonthlySummary.vue'
import AverageMonthlyCostCard from '../components/summary/AverageMonthlyCostCard.vue'
import AverageMonthlyIncomeCard from '../components/summary/AverageMonthlyIncomeCard.vue'
import EntryList from '../components/entry/EntryList.vue'
import { useEntryStore } from '../stores/useEntryStore'
import { storeToRefs } from 'pinia'

useMonthNavigation()

const entryStore = useEntryStore()
const { entries, summary, averageMonthlyCost, averageMonthlyIncome } = storeToRefs(entryStore)
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="(averageMonthlyIncome && averageMonthlyIncome.monthsWithData > 0) || (averageMonthlyCost && averageMonthlyCost.monthsWithData > 0)"
      class="grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      <AverageMonthlyIncomeCard
        v-if="averageMonthlyIncome && averageMonthlyIncome.monthsWithData > 0"
        :data="averageMonthlyIncome"
      />
      <AverageMonthlyCostCard
        v-if="averageMonthlyCost && averageMonthlyCost.monthsWithData > 0"
        :data="averageMonthlyCost"
      />
    </div>

    <MonthNavigator />

    <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      <aside class="lg:sticky lg:top-6">
        <MonthlySummary :summary="summary" />
      </aside>

      <section>
        <EntryList :entries="entries" />
      </section>
    </div>
  </div>
</template>
