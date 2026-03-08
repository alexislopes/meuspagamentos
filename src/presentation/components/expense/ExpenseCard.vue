<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
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
  <UCard>
    <div class="flex items-center justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-medium truncate">{{ expense.name }}</h3>
          <ExpenseStatusBadge :status="expense.status" />
        </div>
        <div class="flex items-center gap-3 mt-1 text-sm text-[var(--ui-text-dimmed)]">
          <span class="font-semibold text-[var(--ui-text)]">{{ formatCents(expense.amountInCents) }}</span>
          <span>Dia {{ expense.dueDay }}</span>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <template v-if="expense.status === ExpenseStatus.PENDING">
          <UButton
            icon="i-lucide-check"
            color="success"
            variant="soft"
            size="sm"
            @click="handlePay"
          />
          <UButton
            icon="i-lucide-fast-forward"
            color="neutral"
            variant="soft"
            size="sm"
            @click="handleSkip"
          />
        </template>
        <template v-else>
          <UButton
            icon="i-lucide-undo-2"
            color="warning"
            variant="soft"
            size="sm"
            @click="handleRevert"
          />
        </template>
        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="showEditModal = true"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="sm"
          @click="showDeleteModal = true"
        />
      </div>
    </div>

    <UModal v-model:open="showDeleteModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold">Confirmar exclusão</h3>
          </template>
          <p>
            Tem certeza que deseja excluir <strong>{{ expense.name }}</strong>?
            Este gasto será removido deste mês e de todos os meses futuros.
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton label="Cancelar" variant="outline" @click="showDeleteModal = false" />
              <UButton label="Excluir" color="error" @click="handleDelete" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

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
            <p class="text-sm text-[var(--ui-text-dimmed)]">
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
  </UCard>
</template>
