<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/useAuthStore'
import { useCreateExpense } from '../../composables/useCreateExpense'
import ExpenseForm from '../expense/ExpenseForm.vue'

const router = useRouter()
const authStore = useAuthStore()
const { showCreateSlideover, close: closeCreateSlideover } = useCreateExpense()

const userInitial = computed(() => {
  const email = authStore.user?.email ?? ''
  return email.charAt(0).toUpperCase()
})

const userMenuItems = computed(() => [
  [{
    label: authStore.user?.email ?? '',
    type: 'label' as const,
  }],
  [{
    label: 'Sair',
    icon: 'i-lucide-log-out',
    color: 'error' as const,
    onSelect: handleLogout,
  }],
])

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}

function handleExpenseSaved() {
  closeCreateSlideover()
}
</script>

<template>
  <header class="flex items-center justify-between py-5 border-b border-muted mb-2">
    <RouterLink to="/" class="flex items-center gap-2 group">
      <UIcon name="i-lucide-wallet" class="text-primary text-lg" />
      <span class="font-serif text-xl font-semibold text-highlighted tracking-tight">Meus Pagamentos</span>
    </RouterLink>
    <div class="flex items-center gap-2">
      <UButton
        label="Novo Gasto"
        icon="i-lucide-plus"
        size="sm"
        @click="showCreateSlideover = true"
      />
      <UDropdownMenu :items="userMenuItems">
        <UAvatar :text="userInitial" size="sm" />
      </UDropdownMenu>
    </div>
  </header>

  <USlideover
    v-model:open="showCreateSlideover"
    title="Novo Gasto Fixo"
    description="Adicione um novo gasto fixo mensal"
  >
    <template #body>
      <ExpenseForm inline @saved="handleExpenseSaved" />
    </template>
  </USlideover>
</template>
