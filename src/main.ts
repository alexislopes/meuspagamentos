import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'
import App from './App.vue'
import { router } from './presentation/router'
import { useAuthStore } from './presentation/stores/useAuthStore'
import './assets/main.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ui)

const authStore = useAuthStore()
authStore.init().then(() => {
  app.mount('#app')
})
