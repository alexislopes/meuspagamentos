import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../../infrastructure/supabase/client'
import type { User } from '@supabase/supabase-js'

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos',
  'User already registered': 'Este e-mail já está cadastrado',
  'Email not confirmed': 'Confirme seu e-mail antes de fazer login',
  'Signup requires a valid password': 'Informe uma senha válida',
}

function translateError(message: string): string {
  return ERROR_MESSAGES[message] ?? 'Ocorreu um erro. Tente novamente.'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  async function init() {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    loading.value = false

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })
  }

  async function login(email: string, password: string) {
    error.value = null
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      error.value = translateError(authError.message)
      throw authError
    }
  }

  async function register(email: string, password: string) {
    error.value = null
    const { error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      error.value = translateError(authError.message)
      throw authError
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    init,
    login,
    register,
    logout,
  }
})
