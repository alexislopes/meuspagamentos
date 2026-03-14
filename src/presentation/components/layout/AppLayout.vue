<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="min-h-screen bg-default">
    <UContainer class="max-w-4xl px-4">
      <AppHeader />
      <main class="pb-12">
        <RouterView />
      </main>
    </UContainer>
  </div>
</template>
