<script setup lang="ts">
import { useNavigationStore } from '../../stores/useNavigationStore'

const navigationStore = useNavigationStore()
</script>

<template>
  <nav class="py-4 border-b border-muted">
    <div class="flex items-center justify-between gap-3">
      <UButton
        icon="i-lucide-chevron-left"
        variant="ghost"
        size="md"
        color="neutral"
        aria-label="Mês anterior"
        @click="navigationStore.goToPreviousMonth()"
      />

      <div class="min-w-48 text-center">
        <h2 class="font-serif text-2xl font-semibold text-highlighted capitalize tracking-tight leading-tight">
          {{ navigationStore.monthName }}
        </h2>
        <div class="flex items-center justify-center gap-2 mt-0.5">
          <span class="text-xs text-dimmed tabular-nums">{{ navigationStore.yearLabel }}</span>
          <template v-if="navigationStore.isCurrentMonth">
            <span class="size-1 rounded-full bg-primary" />
            <span class="text-xs font-medium text-primary">Atual</span>
          </template>
          <template v-else-if="navigationStore.relativeLabel">
            <span class="text-xs text-muted">&middot;</span>
            <span class="text-xs text-muted">{{ navigationStore.relativeLabel }}</span>
          </template>
        </div>
      </div>

      <UButton
        icon="i-lucide-chevron-right"
        variant="ghost"
        size="md"
        color="neutral"
        aria-label="Próximo mês"
        @click="navigationStore.goToNextMonth()"
      />
    </div>

    <div v-if="!navigationStore.isCurrentMonth" class="flex justify-center mt-2">
      <UButton
        label="Voltar para hoje"
        variant="link"
        size="xs"
        icon="i-lucide-corner-down-left"
        @click="navigationStore.goToCurrentMonth()"
      />
    </div>
  </nav>
</template>
