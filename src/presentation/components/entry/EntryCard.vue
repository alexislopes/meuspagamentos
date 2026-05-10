<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { MonthlyEntryDTO } from '../../../application/dto/MonthlyEntryDTO'
import { EntryStatus, EntryValueType } from '../../../domain/value-objects/EntryStatus'
import { useCurrency } from '../../composables/useCurrency'
import { useEntryStore } from '../../stores/useEntryStore'
import EntryStatusBadge from './EntryStatusBadge.vue'
import { DUE_DAY_OPTIONS } from '../../../shared/constants'

const props = defineProps<{
  entry: MonthlyEntryDTO
}>()

const { formatCents } = useCurrency()
const entryStore = useEntryStore()
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
    editForm.name = props.entry.name
    editForm.amount = (props.entry.amountInCents / 100)
      .toFixed(2)
      .replace('.', ',')
    editForm.dueDay = props.entry.dueDay
  }
})

const isIncome = computed(() => props.entry.kind === 'income')
const isConfirmed = computed(() => props.entry.status === EntryStatus.CONFIRMED)
const isSkipped = computed(() => props.entry.status === EntryStatus.SKIPPED)
const isPending = computed(() => props.entry.status === EntryStatus.PENDING)

const confirmTooltip = computed(() => isIncome.value ? 'Marcar como recebido' : 'Marcar como pago')
const dayPillBg = computed(() => {
  if (isConfirmed.value) return isIncome.value ? 'bg-success/10' : 'bg-success/10'
  return 'bg-accented'
})
const dayPillText = computed(() => isConfirmed.value ? 'text-success' : 'text-highlighted')

const amountSign = computed(() => isIncome.value ? '+' : '−')
const amountColor = computed(() => {
  if (isConfirmed.value) return 'text-muted'
  return isIncome.value ? 'font-semibold text-success' : 'font-semibold text-error'
})

const deleteMessage = computed(() => {
  const noun = isIncome.value ? 'receita' : 'gasto'
  return `Tem certeza que deseja excluir ${props.entry.name}? Esta ${noun} será removida deste mês e de todos os meses futuros.`
})

const editTitle = computed(() => isIncome.value ? 'Editar receita' : 'Editar gasto')

const secondaryActions = computed(() => {
  const editItem = props.entry.valueType === EntryValueType.FIXED
    ? [{
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => { showEditModal.value = true },
      }]
    : []
  return [[
    ...editItem,
    {
      label: 'Excluir',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => { showDeleteModal.value = true },
    },
  ]]
})

async function handleConfirm() {
  await entryStore.markAsConfirmed(props.entry.entryId)
}

async function handleSkip() {
  await entryStore.markAsSkipped(props.entry.entryId)
}

async function handleRevert() {
  await entryStore.revertStatus(props.entry.entryId)
}

async function handleDelete() {
  await entryStore.removeEntry(props.entry.entryId)
  showDeleteModal.value = false
}

async function handleEdit() {
  const amount = parseFloat(editForm.amount.replace(',', '.'))
  if (!editForm.name.trim() || isNaN(amount) || amount <= 0) return

  await entryStore.editEntry({
    valueType: EntryValueType.FIXED,
    entryId: props.entry.entryId,
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
      isConfirmed ? 'border-success/20 bg-success/4' : '',
      isSkipped ? 'border-muted opacity-50' : '',
      isPending ? 'border-muted hover:border-accented bg-elevated' : '',
    ]"
  >
    <!-- Kind indicator + due day pill -->
    <div
      class="flex flex-col items-center justify-center w-9 h-9 rounded-md text-center shrink-0"
      :class="dayPillBg"
    >
      <span class="text-[9px] text-muted leading-none uppercase">dia</span>
      <span class="text-sm font-bold leading-tight tabular-nums" :class="dayPillText">{{ entry.dueDay }}</span>
    </div>

    <!-- Name + amount -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <UIcon
          :name="isIncome ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'"
          :class="isIncome ? 'text-success' : 'text-error'"
          class="text-sm shrink-0"
        />
        <h3 class="text-sm font-medium truncate" :class="isConfirmed ? 'line-through text-muted' : 'text-highlighted'">
          {{ entry.name }}
        </h3>
        <EntryStatusBadge v-if="!isPending" :status="entry.status" :kind="entry.kind" />
        <span
          v-if="entry.valueType === EntryValueType.RELATIVE"
          class="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info uppercase tracking-wide"
        >
          calculado
        </span>
      </div>
      <span class="text-sm tabular-nums" :class="amountColor">
        {{ amountSign }} {{ formatCents(entry.amountInCents) }}
      </span>
      <span v-if="entry.formulaDescription" class="block text-xs text-dimmed">
        {{ entry.formulaDescription }}
      </span>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 shrink-0">
      <template v-if="isPending">
        <UTooltip :text="confirmTooltip">
          <UButton
            icon="i-lucide-check"
            color="success"
            variant="soft"
            size="xs"
            @click="handleConfirm"
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
          :description="deleteMessage"
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

  <UModal v-model:open="showEditModal">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="font-semibold">{{ editTitle }}</h3>
        </template>
        <form @submit.prevent="handleEdit" class="space-y-4">
          <UFormField :label="isIncome ? 'Nome da receita' : 'Nome do gasto'">
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
          <UFormField :label="isIncome ? 'Dia do recebimento' : 'Dia de vencimento'">
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
