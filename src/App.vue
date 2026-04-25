<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppConfig } from '@nuxt/ui/runtime/vue/composables/useAppConfig.js'
import { ExpenseContext } from './domain/value-objects/ExpenseContext'
import { useContextStore } from './presentation/stores/useContextStore'

const contextStore = useContextStore()
const { current } = storeToRefs(contextStore)

const appConfig = useAppConfig()

watch(
  current,
  (ctx) => {
    document.documentElement.dataset.context = ctx
    appConfig.ui.colors.primary = ctx === ExpenseContext.PJ ? 'sky' : 'amber'
  },
  { immediate: true },
)
</script>

<template>
  <UApp>
    <RouterView />
  </UApp>
</template>
