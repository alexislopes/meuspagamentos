<script setup lang="ts">
import { useNavigationStore } from '../../stores/useNavigationStore'

const navigationStore = useNavigationStore()
</script>

<template>
  <div class="flex items-center justify-between">
    <UButtonGroup>
      <UButton
        icon="i-lucide-chevron-left"
        variant="outline"
        @click="navigationStore.goToPreviousMonth()"
      />
      <UButton
        icon="i-lucide-chevron-right"
        variant="outline"
        @click="navigationStore.goToNextMonth()"
      />
    </UButtonGroup>

    <h2 class="text-xl font-semibold capitalize">
      {{ navigationStore.monthLabel }}
    </h2>

    <UButton
      v-if="!navigationStore.isCurrentMonth"
      label="Hoje"
      variant="soft"
      icon="i-lucide-calendar"
      @click="navigationStore.goToCurrentMonth()"
    />
    <div v-else class="w-20" />
  </div>
</template>
