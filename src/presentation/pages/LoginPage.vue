<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({ email: '', password: '' })
const isRegister = ref(false)
const submitting = ref(false)

async function handleSubmit() {
  submitting.value = true
  authStore.error = null

  try {
    if (isRegister.value) {
      await authStore.register(form.email, form.password)
    } else {
      await authStore.login(form.email, form.password)
    }
    router.push({ name: 'dashboard' })
  } catch {
    // error is already set in the store
  } finally {
    submitting.value = false
  }
}

function toggleMode() {
  isRegister.value = !isRegister.value
  authStore.error = null
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-default">
    <div class="w-full max-w-sm">
      <div class="rounded-xl border border-muted bg-elevated p-8">
        <div class="space-y-6">
          <div class="text-center">
            <div class="size-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UIcon name="i-lucide-wallet" class="text-2xl text-primary" />
            </div>
            <h1 class="font-serif text-2xl font-semibold text-highlighted tracking-tight">Meus Pagamentos</h1>
            <p class="text-sm text-muted mt-1">
              {{ isRegister ? 'Crie sua conta para continuar' : 'Faça login para continuar' }}
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <UFormField label="E-mail">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="seu@email.com"
                icon="i-lucide-mail"
                required
                class="w-full"
              />
            </UFormField>

            <UFormField label="Senha">
              <UInput
                v-model="form.password"
                type="password"
                placeholder="Sua senha"
                icon="i-lucide-lock"
                required
                class="w-full"
              />
            </UFormField>

            <UAlert
              v-if="authStore.error"
              color="error"
              variant="soft"
              icon="i-lucide-circle-alert"
              :description="authStore.error"
            />

            <UButton
              type="submit"
              :label="isRegister ? 'Criar conta' : 'Entrar'"
              block
              :loading="submitting"
            />
          </form>

          <p class="text-center text-sm text-muted">
            <template v-if="isRegister">
              Já tem conta?
              <UButton variant="link" label="Entrar" size="sm" @click="toggleMode" />
            </template>
            <template v-else>
              Ainda não tem conta?
              <UButton variant="link" label="Criar conta" size="sm" @click="toggleMode" />
            </template>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
