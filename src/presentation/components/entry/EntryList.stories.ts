import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EntryList from './EntryList.vue'
import { EntryStatus } from '../../../domain/value-objects/EntryStatus'
import type { MonthlyEntryDTO } from '../../../application/dto/MonthlyEntryDTO'

const expenses: MonthlyEntryDTO[] = [
  { entryId: '1', name: 'Aluguel', amountInCents: 150000, dueDay: 5, kind: 'expense', status: EntryStatus.PENDING },
  { entryId: '2', name: 'Energia', amountInCents: 25000, dueDay: 12, kind: 'expense', status: EntryStatus.CONFIRMED },
  { entryId: '3', name: 'Internet', amountInCents: 12000, dueDay: 20, kind: 'expense', status: EntryStatus.PENDING },
  { entryId: '4', name: 'Streaming', amountInCents: 5500, dueDay: 25, kind: 'expense', status: EntryStatus.SKIPPED },
]

const incomes: MonthlyEntryDTO[] = [
  { entryId: '5', name: 'Salário', amountInCents: 800000, dueDay: 5, kind: 'income', status: EntryStatus.CONFIRMED },
  { entryId: '6', name: 'Bônus', amountInCents: 100000, dueDay: 28, kind: 'income', status: EntryStatus.PENDING },
]

const meta: Meta<typeof EntryList> = {
  title: 'Entry/EntryList',
  component: EntryList,
  decorators: [
    () => ({ template: '<div class="max-w-2xl p-6"><story /></div>' }),
  ],
}

export default meta
type Story = StoryObj<typeof EntryList>

export const Empty: Story = { args: { entries: [] } }
export const OnlyExpenses: Story = { args: { entries: expenses } }
export const OnlyIncomes: Story = { args: { entries: incomes } }
export const Mixed: Story = { args: { entries: [...expenses, ...incomes] } }
