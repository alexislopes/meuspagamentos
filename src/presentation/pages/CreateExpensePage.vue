<script setup lang="ts">
import ExpenseForm from '../components/expense/ExpenseForm.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <UButton icon="i-lucide-arrow-left" variant="ghost" to="/" />
      <h1 class="text-xl font-semibold">Novo Gasto Fixo</h1>
    </div>
    <UCard>
      <ExpenseForm />
    </UCard>
  </div>
</template>
