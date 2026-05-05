<script setup lang="ts">
import EntryForm from '../components/entry/EntryForm.vue'
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <UButton icon="i-lucide-arrow-left" variant="ghost" to="/" />
      <h1 class="text-xl font-semibold">Novo lançamento</h1>
    </div>
    <UCard>
      <EntryForm />
    </UCard>
  </div>
</template>
