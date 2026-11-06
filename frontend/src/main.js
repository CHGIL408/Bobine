import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/main.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// iOS Safari n'applique :active au toucher que si la page écoute touchstart
document.addEventListener('touchstart', () => {}, { passive: true })
