import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AverageMonthlyCostCard from './AverageMonthlyCostCard.vue'
import AverageMonthlyIncomeCard from './AverageMonthlyIncomeCard.vue'

const meta = {
  title: 'Summary/AverageCards',
  decorators: [() => ({ template: '<div class="max-w-md p-6 space-y-4"><story /></div>' })],
} as Meta

export default meta

export const Cost: StoryObj<typeof AverageMonthlyCostCard> = {
  render: (args) => ({
    components: { AverageMonthlyCostCard },
    setup: () => ({ args }),
    template: '<AverageMonthlyCostCard v-bind="args" />',
  }),
  args: {
    data: { averageInCents: 280000, monthsWithData: 8 },
  },
}

export const Income: StoryObj<typeof AverageMonthlyIncomeCard> = {
  render: (args) => ({
    components: { AverageMonthlyIncomeCard },
    setup: () => ({ args }),
    template: '<AverageMonthlyIncomeCard v-bind="args" />',
  }),
  args: {
    data: { averageInCents: 850000, monthsWithData: 6 },
  },
}
