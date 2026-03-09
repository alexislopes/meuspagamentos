<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="flex items-center justify-between py-4">
    <RouterLink to="/" class="text-xl font-bold text-[var(--ui-primary)]">
      Meus Pagamentos
    </RouterLink>
    <div class="flex items-center gap-2">
      <UButton
        to="/expenses/new"
        label="Novo Gasto"
        icon="i-lucide-plus"
        size="sm"
      />
      <UButton
        label="Sair"
        icon="i-lucide-log-out"
        variant="ghost"
        size="sm"
        @click="handleLogout"
      />
    </div>
  </header>
</template>
