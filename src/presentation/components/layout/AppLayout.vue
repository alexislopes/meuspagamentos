<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>

<template>
  <UContainer class="max-w-2xl">
    <AppHeader />
    <main class="pb-8">
      <RouterView />
    </main>
  </UContainer>
</template>
