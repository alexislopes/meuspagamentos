<script setup lang="ts">
</script>

<template>
  <header class="flex items-center justify-between py-4">
    <RouterLink to="/" class="text-xl font-bold text-[var(--ui-primary)]">
      Meus Pagamentos
    </RouterLink>
    <UButton
      to="/expenses/new"
      label="Novo Gasto"
      icon="i-lucide-plus"
      size="sm"
    />
  </header>
</template>
