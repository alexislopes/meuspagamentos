<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import type { CreateFixedExpenseDTO } from '../../../application/dto/CreateFixedExpenseDTO'
import { useExpenseStore } from '../../stores/useExpenseStore'
import { DUE_DAY_OPTIONS } from '../../../shared/constants'

const props = withDefaults(defineProps<{
  inline?: boolean
}>(), {
  inline: false,
})

const emit = defineEmits<{
  saved: []
}>()

const router = useRouter()
const expenseStore = useExpenseStore()

const form = reactive({
  name: '',
  amount: '',
  dueDay: 1,
})

const dueDayItems = DUE_DAY_OPTIONS.map((opt) => ({
  label: opt.label,
  value: opt.value,
}))

async function handleSubmit() {
  const amount = parseFloat(form.amount.replace(',', '.'))
  if (!form.name.trim() || isNaN(amount) || amount <= 0) return

  const dto: CreateFixedExpenseDTO = {
    name: form.name.trim(),
    amount,
    dueDay: form.dueDay,
  }

  await expenseStore.addExpense(dto)

  if (props.inline) {
    form.name = ''
    form.amount = ''
    form.dueDay = 1
    emit('saved')
  } else {
    router.push('/')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <UFormField label="Nome do gasto">
      <UInput
        v-model="form.name"
        placeholder="Ex: Netflix, Aluguel, Energia..."
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

    <UFormField label="Dia de vencimento">
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
