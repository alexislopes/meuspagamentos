import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('../components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../pages/DashboardPage.vue'),
      },
      {
        path: 'entries/new',
        name: 'create-entry',
        component: () => import('../pages/CreateEntryPage.vue'),
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (authStore.loading) {
    await authStore.waitForInit()
  }

  if (to.matched.some((r) => r.meta.requiresAuth) && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})
