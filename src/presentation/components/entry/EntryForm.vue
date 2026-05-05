<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEntryStore } from '../../stores/useEntryStore'
import { DUE_DAY_OPTIONS } from '../../../shared/constants'
import type { EntryKind, Recurrence } from '../../../domain/value-objects/EntryStatus'

const props = withDefaults(defineProps<{
  inline?: boolean
}>(), {
  inline: false,
})

const emit = defineEmits<{
  saved: []
}>()

const router = useRouter()
const entryStore = useEntryStore()

const form = reactive<{
  name: string
  amount: string
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
}>({
  name: '',
  amount: '',
  dueDay: 1,
  kind: 'expense',
  recurrence: 'monthly',
})

const dueDayItems = DUE_DAY_OPTIONS.map((opt) => ({
  label: opt.label,
  value: opt.value,
}))

const kindItems = [
  { label: 'Despesa', value: 'expense' as const, icon: 'i-lucide-arrow-up-right' },
  { label: 'Receita', value: 'income' as const, icon: 'i-lucide-arrow-down-left' },
]

const recurrenceItems = [
  { label: 'Mensal', value: 'monthly' as const },
  { label: 'Pontual', value: 'once' as const },
]

const nameLabel = computed(() => form.kind === 'income' ? 'Nome da receita' : 'Nome do gasto')
const dayLabel = computed(() => {
  if (form.recurrence === 'once') return 'Dia em que ocorre'
  return form.kind === 'income' ? 'Dia do recebimento' : 'Dia de vencimento'
})
const namePlaceholder = computed(() =>
  form.kind === 'income' ? 'Ex: Salário, Aluguel recebido...' : 'Ex: Netflix, Aluguel, Energia...',
)

async function handleSubmit() {
  const amount = parseFloat(form.amount.replace(',', '.'))
  if (!form.name.trim() || isNaN(amount) || amount <= 0) return

  await entryStore.addEntry({
    name: form.name.trim(),
    amount,
    dueDay: form.dueDay,
    kind: form.kind,
    recurrence: form.recurrence,
  })

  if (props.inline) {
    form.name = ''
    form.amount = ''
    form.dueDay = 1
    form.kind = 'expense'
    form.recurrence = 'monthly'
    emit('saved')
  } else {
    router.push('/')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <UFormField label="Tipo">
      <URadioGroup v-model="form.kind" :items="kindItems" orientation="horizontal" />
    </UFormField>

    <UFormField label="Recorrência">
      <URadioGroup v-model="form.recurrence" :items="recurrenceItems" orientation="horizontal" />
    </UFormField>

    <UFormField :label="nameLabel">
      <UInput
        v-model="form.name"
        :placeholder="namePlaceholder"
        icon="i-lucide-text"
        required
      />
    </UFormField>

    <UFormField label="Valor (R$)">
      <UInput
        v-model="form.amount"
        placeholder="0,00"
        icon="i-lucide-dollar-sign"
        inputmode="decimal"
        required
      />
    </UFormField>

    <UFormField :label="dayLabel">
      <USelect
        v-model="form.dueDay"
        :items="dueDayItems"
        value-key="value"
      />
    </UFormField>

    <div class="flex gap-2 pt-2">
      <UButton type="submit" label="Salvar" icon="i-lucide-check" />
      <UButton label="Cancelar" variant="outline" to="/" />
    </div>
  </form>
</template>
