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
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <UCard>
        <div class="space-y-6">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-[var(--ui-primary)]">Meus Pagamentos</h1>
            <p class="text-sm text-dimmed mt-1">
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
              />
            </UFormField>

            <UFormField label="Senha">
              <UInput
                v-model="form.password"
                type="password"
                placeholder="Sua senha"
                icon="i-lucide-lock"
                required
              />
            </UFormField>

            <p v-if="authStore.error" class="text-sm text-[var(--ui-error)]">
              {{ authStore.error }}
            </p>

            <UButton
              type="submit"
              :label="isRegister ? 'Criar conta' : 'Entrar'"
              block
              :loading="submitting"
            />
          </form>

          <p class="text-center text-sm text-dimmed">
            <template v-if="isRegister">
              Já tem conta?
              <button class="text-[var(--ui-primary)] hover:underline" @click="toggleMode">
                Entrar
              </button>
            </template>
            <template v-else>
              Ainda não tem conta?
              <button class="text-[var(--ui-primary)] hover:underline" @click="toggleMode">
                Criar conta
              </button>
            </template>
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
