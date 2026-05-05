import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EntryCard from './EntryCard.vue'
import { EntryStatus } from '../../../domain/value-objects/EntryStatus'
import type { MonthlyEntryDTO } from '../../../application/dto/MonthlyEntryDTO'

function entry(overrides: Partial<MonthlyEntryDTO> = {}): MonthlyEntryDTO {
  return {
    entryId: overrides.entryId ?? 'demo',
    name: overrides.name ?? 'Aluguel',
    amountInCents: overrides.amountInCents ?? 150000,
    dueDay: overrides.dueDay ?? 5,
    kind: overrides.kind ?? 'expense',
    status: overrides.status ?? EntryStatus.PENDING,
  }
}

const meta: Meta<typeof EntryCard> = {
  title: 'Entry/EntryCard',
  component: EntryCard,
  decorators: [
    () => ({ template: '<div class="max-w-md p-6"><story /></div>' }),
  ],
}

export default meta
type Story = StoryObj<typeof EntryCard>

export const ExpensePending: Story = {
  args: { entry: entry({ kind: 'expense', status: EntryStatus.PENDING }) },
}
export const ExpenseConfirmed: Story = {
  args: { entry: entry({ kind: 'expense', status: EntryStatus.CONFIRMED }) },
}
export const ExpenseSkipped: Story = {
  args: { entry: entry({ kind: 'expense', status: EntryStatus.SKIPPED }) },
}
export const IncomePending: Story = {
  args: { entry: entry({ kind: 'income', name: 'Salário', amountInCents: 800000, status: EntryStatus.PENDING }) },
}
export const IncomeConfirmed: Story = {
  args: { entry: entry({ kind: 'income', name: 'Salário', amountInCents: 800000, status: EntryStatus.CONFIRMED }) },
}
export const IncomeSkipped: Story = {
  args: { entry: entry({ kind: 'income', name: 'Salário', amountInCents: 800000, status: EntryStatus.SKIPPED }) },
}
export const LongName: Story = {
  args: {
    entry: entry({
      name: 'Plano de saúde corporativo da família com cobertura ampliada',
      amountInCents: 1234500,
    }),
  },
}
