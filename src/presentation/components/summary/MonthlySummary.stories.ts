import type { Meta, StoryObj } from '@storybook/vue3-vite'
import MonthlySummary from './MonthlySummary.vue'
import type { MonthlySummaryDTO } from '../../../application/dto/MonthlySummaryDTO'

function summary(overrides: Partial<MonthlySummaryDTO> = {}): MonthlySummaryDTO {
  return {
    totalIncomeInCents: 0,
    totalExpenseInCents: 0,
    confirmedIncomeInCents: 0,
    pendingIncomeInCents: 0,
    confirmedExpenseInCents: 0,
    pendingExpenseInCents: 0,
    balanceInCents: 0,
    incomeCount: 0,
    expenseCount: 0,
    confirmedCount: 0,
    pendingCount: 0,
    skippedCount: 0,
    ...overrides,
  }
}

const meta: Meta<typeof MonthlySummary> = {
  title: 'Summary/MonthlySummary',
  component: MonthlySummary,
  decorators: [() => ({ template: '<div class="max-w-xs p-6"><story /></div>' })],
}

export default meta
type Story = StoryObj<typeof MonthlySummary>

export const PositiveBalance: Story = {
  args: {
    summary: summary({
      totalIncomeInCents: 800000,
      totalExpenseInCents: 350000,
      confirmedIncomeInCents: 800000,
      confirmedExpenseInCents: 200000,
      pendingExpenseInCents: 150000,
      balanceInCents: 450000,
      incomeCount: 1,
      expenseCount: 4,
      confirmedCount: 3,
      pendingCount: 2,
    }),
  },
}

export const NegativeBalance: Story = {
  args: {
    summary: summary({
      totalIncomeInCents: 200000,
      totalExpenseInCents: 350000,
      pendingIncomeInCents: 200000,
      confirmedExpenseInCents: 350000,
      balanceInCents: -150000,
      incomeCount: 1,
      expenseCount: 3,
      confirmedCount: 3,
      pendingCount: 1,
    }),
  },
}

export const Empty: Story = { args: { summary: summary() } }
