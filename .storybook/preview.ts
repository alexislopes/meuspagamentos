import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'
import '../src/assets/main.css'

setup((app) => {
  app.use(createPinia())
  app.use(ui)
})

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#0a0a0a' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
}

export default preview
