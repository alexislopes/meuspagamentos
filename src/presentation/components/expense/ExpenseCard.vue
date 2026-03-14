<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { MonthlyExpenseDTO } from '../../../application/dto/MonthlyExpenseDTO'
import { ExpenseStatus } from '../../../domain/value-objects/ExpenseStatus'
import { useCurrency } from '../../composables/useCurrency'
import { useExpenseStore } from '../../stores/useExpenseStore'
import ExpenseStatusBadge from './ExpenseStatusBadge.vue'
import { DUE_DAY_OPTIONS } from '../../../shared/constants'

const props = defineProps<{
  expense: MonthlyExpenseDTO
}>()

const { formatCents } = useCurrency()
const expenseStore = useExpenseStore()
const showDeleteModal = ref(false)
const showEditModal = ref(false)

const editForm = reactive({
  name: '',
  amount: '',
  dueDay: 1,
})

const dueDayItems = DUE_DAY_OPTIONS.map((opt) => ({
  label: opt.label,
  value: opt.value,
}))

watch(showEditModal, (open) => {
  if (open) {
    editForm.name = props.expense.name
    editForm.amount = (props.expense.amountInCents / 100)
      .toFixed(2)
      .replace('.', ',')
    editForm.dueDay = props.expense.dueDay
  }
})

const isPaid = computed(() => props.expense.status === ExpenseStatus.PAID)
const isSkipped = computed(() => props.expense.status === ExpenseStatus.SKIPPED)
const isPending = computed(() => props.expense.status === ExpenseStatus.PENDING)

const secondaryActions = computed(() => [
  [{
    label: 'Editar',
    icon: 'i-lucide-pencil',
    onSelect: () => { showEditModal.value = true },
  }, {
    label: 'Excluir',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => { showDeleteModal.value = true },
  }],
])

async function handlePay() {
  await expenseStore.markAsPaid(props.expense.expenseId)
}

async function handleSkip() {
  await expenseStore.markAsSkipped(props.expense.expenseId)
}

async function handleRevert() {
  await expenseStore.revertStatus(props.expense.expenseId)
}

async function handleDelete() {
  await expenseStore.removeExpense(props.expense.expenseId)
  showDeleteModal.value = false
}

async function handleEdit() {
  const amount = parseFloat(editForm.amount.replace(',', '.'))
  if (!editForm.name.trim() || isNaN(amount) || amount <= 0) return

  await expenseStore.editExpense({
    expenseId: props.expense.expenseId,
    name: editForm.name.trim(),
    amount,
    dueDay: editForm.dueDay,
  })
  showEditModal.value = false
}
</script>

<template>
  <div
    class="group flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors"
    :class="[
      isPaid ? 'border-success/20 bg-success/4' : '',
      isSkipped ? 'border-muted opacity-50' : '',
      isPending ? 'border-muted hover:border-accented bg-elevated' : '',
    ]"
  >
    <!-- Due day pill -->
    <div
      class="flex flex-col items-center justify-center w-9 h-9 rounded-md text-center shrink-0"
      :class="isPaid ? 'bg-success/10' : 'bg-accented'"
    >
      <span class="text-[9px] text-muted leading-none uppercase">dia</span>
      <span class="text-sm font-bold leading-tight tabular-nums" :class="isPaid ? 'text-success' : 'text-highlighted'">{{ expense.dueDay }}</span>
    </div>

    <!-- Name + amount -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-medium truncate" :class="isPaid ? 'line-through text-muted' : 'text-highlighted'">
          {{ expense.name }}
        </h3>
        <ExpenseStatusBadge v-if="!isPending" :status="expense.status" />
      </div>
      <span class="text-sm tabular-nums" :class="isPaid ? 'text-muted' : 'font-semibold text-toned'">
        {{ formatCents(expense.amountInCents) }}
      </span>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 shrink-0">
      <template v-if="isPending">
        <UTooltip text="Marcar como pago">
          <UButton
            icon="i-lucide-check"
            color="success"
            variant="soft"
            size="xs"
            @click="handlePay"
          />
        </UTooltip>
        <UTooltip text="Pular este mês">
          <UButton
            icon="i-lucide-fast-forward"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="handleSkip"
          />
        </UTooltip>
      </template>
      <template v-else>
        <UTooltip text="Reverter para pendente">
          <UButton
            icon="i-lucide-undo-2"
            color="warning"
            variant="ghost"
            size="xs"
            @click="handleRevert"
          />
        </UTooltip>
      </template>
      <UDropdownMenu :items="secondaryActions">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          variant="ghost"
          size="xs"
          color="neutral"
          class="opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </UDropdownMenu>
    </div>
  </div>

  <!-- Delete modal -->
  <UModal v-model:open="showDeleteModal">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="font-semibold">Confirmar exclusão</h3>
        </template>
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :description="`Tem certeza que deseja excluir ${expense.name}? Este gasto será removido deste mês e de todos os meses futuros.`"
        />
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Cancelar" variant="outline" @click="showDeleteModal = false" />
            <UButton label="Excluir" color="error" @click="handleDelete" />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <!-- Edit modal -->
  <UModal v-model:open="showEditModal">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="font-semibold">Editar gasto</h3>
        </template>
        <form @submit.prevent="handleEdit" class="space-y-4">
          <UFormField label="Nome do gasto">
            <UInput
              v-model="editForm.name"
              placeholder="Ex: Netflix, Aluguel..."
              icon="i-lucide-text"
              required
            />
          </UFormField>
          <UFormField label="Valor (R$)">
            <UInput
              v-model="editForm.amount"
              placeholder="0,00"
              icon="i-lucide-dollar-sign"
              inputmode="decimal"
              required
            />
          </UFormField>
          <UFormField label="Dia de vencimento">
            <USelect
              v-model="editForm.dueDay"
              :items="dueDayItems"
              value-key="value"
            />
          </UFormField>
          <p class="text-sm text-dimmed">
            As alterações serão aplicadas a partir deste mês em diante.
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancelar" variant="outline" @click="showEditModal = false" />
            <UButton type="submit" label="Salvar" icon="i-lucide-check" />
          </div>
        </form>
      </UCard>
    </template>
  </UModal>
</template>
