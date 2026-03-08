import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../pages/DashboardPage.vue'),
  },
  {
    path: '/expenses/new',
    name: 'create-expense',
    component: () => import('../pages/CreateExpensePage.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
