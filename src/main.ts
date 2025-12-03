import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import App from './App.vue'
import router from './router'

// Styles
import './assets/main.css'
import 'primeicons/primeicons.css'

const app = createApp(App)

// Pinia with persistence
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)

// Router
app.use(router)

// PrimeVue with Aura theme
app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
})

app.mount('#app')
