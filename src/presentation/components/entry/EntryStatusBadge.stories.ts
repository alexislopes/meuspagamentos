import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EntryStatusBadge from './EntryStatusBadge.vue'
import { EntryStatus } from '../../../domain/value-objects/EntryStatus'

const meta: Meta<typeof EntryStatusBadge> = {
  title: 'Entry/EntryStatusBadge',
  component: EntryStatusBadge,
  argTypes: {
    status: {
      control: 'select',
      options: [EntryStatus.PENDING, EntryStatus.CONFIRMED, EntryStatus.SKIPPED],
    },
    kind: {
      control: 'inline-radio',
      options: ['expense', 'income'],
    },
  },
}

export default meta
type Story = StoryObj<typeof EntryStatusBadge>

export const ExpensePending: Story = { args: { status: EntryStatus.PENDING, kind: 'expense' } }
export const ExpenseConfirmed: Story = { args: { status: EntryStatus.CONFIRMED, kind: 'expense' } }
export const ExpenseSkipped: Story = { args: { status: EntryStatus.SKIPPED, kind: 'expense' } }
export const IncomePending: Story = { args: { status: EntryStatus.PENDING, kind: 'income' } }
export const IncomeConfirmed: Story = { args: { status: EntryStatus.CONFIRMED, kind: 'income' } }
export const IncomeSkipped: Story = { args: { status: EntryStatus.SKIPPED, kind: 'income' } }
