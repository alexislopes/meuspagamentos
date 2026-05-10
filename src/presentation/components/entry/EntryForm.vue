<script setup lang="ts">
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEntryStore } from '../../stores/useEntryStore'
import { DUE_DAY_OPTIONS } from '../../../shared/constants'
import {
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
  type EntryKind,
  type Recurrence,
} from '../../../domain/value-objects/EntryStatus'
import type { EntryFormula, FormulaTerm } from '../../../domain/value-objects/EntryFormula'
import { FormulaResolver } from '../../../domain/services/FormulaResolver'
import { Money } from '../../../domain/value-objects/Money'
import { useCurrency } from '../../composables/useCurrency'
import { useContextStore } from '../../stores/useContextStore'

const props = withDefaults(defineProps<{ inline?: boolean }>(), { inline: false })
const emit = defineEmits<{ saved: [] }>()

const router = useRouter()
const entryStore = useEntryStore()
const contextStore = useContextStore()
const { formatCents } = useCurrency()

const valueType = ref<EntryValueType>(EntryValueType.FIXED)

const fixedForm = reactive({
  name: '',
  amount: '',
  dueDay: 1,
  kind: 'expense' as EntryKind,
  recurrence: 'monthly' as Recurrence,
})

const relativeForm = reactive({
  name: '',
  dueDay: 1,
  kind: 'expense' as EntryKind,
  percentage: '10',
  terms: [] as FormulaTerm[],
})

function addAllIncomeTerm() {
  relativeForm.terms.push({
    set: { type: FormulaSetType.ALL, kind: 'income' },
    sign: FormulaTermSign.POSITIVE,
  })
}

function addAllExpenseTerm() {
  relativeForm.terms.push({
    set: { type: FormulaSetType.ALL, kind: 'expense' },
    sign: FormulaTermSign.POSITIVE,
  })
}

function toggleSign(i: number) {
  const t = relativeForm.terms[i]
  t.sign = t.sign === FormulaTermSign.POSITIVE ? FormulaTermSign.NEGATIVE : FormulaTermSign.POSITIVE
}

function removeTerm(i: number) {
  relativeForm.terms.splice(i, 1)
}

const valueTypeItems = [
  { label: 'Fixo', value: EntryValueType.FIXED },
  { label: 'Relativo', value: EntryValueType.RELATIVE },
]

const dueDayItems = DUE_DAY_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))
const kindItems = [
  { label: 'Despesa', value: 'expense' as const, icon: 'i-lucide-arrow-up-right' },
  { label: 'Receita', value: 'income' as const, icon: 'i-lucide-arrow-down-left' },
]
const recurrenceItems = [
  { label: 'Mensal', value: 'monthly' as const },
  { label: 'Pontual', value: 'once' as const },
]

const previewCents = computed(() => {
  const pct = parseFloat(relativeForm.percentage.replace(',', '.'))
  if (isNaN(pct) || pct <= 0 || relativeForm.terms.length === 0) return null
  const formula: EntryFormula = { terms: relativeForm.terms, percentage: pct }
  try {
    const resolver = new FormulaResolver()
    const result = resolver.resolve({
      formula,
      ownerContext: contextStore.current,
      fixedViews: entryStore.entries
        .filter((e) => e.valueType === EntryValueType.FIXED)
        .map((e) => ({
          entryId: e.entryId,
          name: e.name,
          amount: Money.fromCents(e.amountInCents),
          dueDay: e.dueDay,
          kind: e.kind,
          status: e.status,
          context: contextStore.current,
          valueType: EntryValueType.FIXED,
        })),
    })
    return result.inCents
  } catch {
    return null
  }
})

const canSubmitRelative = computed(() => {
  const pct = parseFloat(relativeForm.percentage.replace(',', '.'))
  return relativeForm.name.trim().length > 0 &&
    !isNaN(pct) && pct > 0 &&
    relativeForm.terms.length > 0
})

function termLabel(term: FormulaTerm): string {
  if (term.set.type === FormulaSetType.ALL) {
    return term.set.kind === 'income' ? 'Todas as receitas' : 'Todas as despesas'
  }
  return `${term.set.entryIds.length} item(ns)`
}

async function handleSubmit() {
  if (valueType.value === EntryValueType.FIXED) {
    const amount = parseFloat(fixedForm.amount.replace(',', '.'))
    if (!fixedForm.name.trim() || isNaN(amount) || amount <= 0) return
    await entryStore.addEntry({
      valueType: EntryValueType.FIXED,
      name: fixedForm.name.trim(),
      amount,
      dueDay: fixedForm.dueDay,
      kind: fixedForm.kind,
      recurrence: fixedForm.recurrence,
    })
  } else {
    if (!canSubmitRelative.value) return
    const pct = parseFloat(relativeForm.percentage.replace(',', '.'))
    await entryStore.addEntry({
      valueType: EntryValueType.RELATIVE,
      name: relativeForm.name.trim(),
      formula: { terms: [...relativeForm.terms], percentage: pct },
      dueDay: relativeForm.dueDay,
      kind: relativeForm.kind,
    })
  }

  if (props.inline) {
    fixedForm.name = ''; fixedForm.amount = ''; fixedForm.dueDay = 1
    fixedForm.kind = 'expense'; fixedForm.recurrence = 'monthly'
    relativeForm.name = ''; relativeForm.dueDay = 1; relativeForm.kind = 'expense'
    relativeForm.percentage = '10'; relativeForm.terms = []
    valueType.value = EntryValueType.FIXED
    emit('saved')
  } else {
    router.push('/')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <UFormField label="Tipo de valor">
      <URadioGroup v-model="valueType" :items="valueTypeItems" orientation="horizontal" />
    </UFormField>

    <template v-if="valueType === EntryValueType.FIXED">
      <UFormField label="Tipo">
        <URadioGroup v-model="fixedForm.kind" :items="kindItems" orientation="horizontal" />
      </UFormField>
      <UFormField label="Recorrência">
        <URadioGroup v-model="fixedForm.recurrence" :items="recurrenceItems" orientation="horizontal" />
      </UFormField>
      <UFormField :label="fixedForm.kind === 'income' ? 'Nome da receita' : 'Nome do gasto'">
        <UInput v-model="fixedForm.name" icon="i-lucide-text" required />
      </UFormField>
      <UFormField label="Valor (R$)">
        <UInput v-model="fixedForm.amount" placeholder="0,00" icon="i-lucide-dollar-sign" inputmode="decimal" required />
      </UFormField>
      <UFormField :label="fixedForm.kind === 'income' ? 'Dia do recebimento' : 'Dia de vencimento'">
        <USelect v-model="fixedForm.dueDay" :items="dueDayItems" value-key="value" />
      </UFormField>
    </template>

    <template v-else>
      <UFormField label="Tipo">
        <URadioGroup v-model="relativeForm.kind" :items="kindItems" orientation="horizontal" />
      </UFormField>
      <UFormField label="Nome">
        <UInput v-model="relativeForm.name" icon="i-lucide-text" required />
      </UFormField>

      <UFormField label="Base de cálculo">
        <div class="space-y-2">
          <div v-for="(term, i) in relativeForm.terms" :key="i" class="flex items-center gap-2">
            <UButton
              :label="term.sign === 1 ? '+' : '−'"
              variant="outline"
              size="xs"
              @click="toggleSign(i)"
            />
            <span class="flex-1 text-sm">{{ termLabel(term) }}</span>
            <UButton icon="i-lucide-x" variant="ghost" size="xs" @click="removeTerm(i)" />
          </div>
          <div class="flex gap-2">
            <UButton label="+ Receitas" variant="soft" size="xs" @click="addAllIncomeTerm" />
            <UButton label="+ Despesas" variant="soft" size="xs" @click="addAllExpenseTerm" />
          </div>
        </div>
      </UFormField>

      <UFormField label="Aplicar percentual (%)">
        <UInput v-model="relativeForm.percentage" inputmode="decimal" required />
      </UFormField>

      <UFormField label="Dia de vencimento">
        <USelect v-model="relativeForm.dueDay" :items="dueDayItems" value-key="value" />
      </UFormField>

      <div v-if="previewCents !== null" class="text-sm text-muted">
        Pré-visualização: <span class="font-semibold text-highlighted">{{ formatCents(previewCents) }}</span>
      </div>
    </template>

    <div class="flex gap-2 pt-2">
      <UButton
        type="submit"
        label="Salvar"
        icon="i-lucide-check"
        :disabled="valueType === EntryValueType.RELATIVE && !canSubmitRelative"
      />
      <UButton label="Cancelar" variant="outline" to="/" />
    </div>
  </form>
</template>
