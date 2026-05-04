import { createApp } from 'vue'
import App from './App.vue'
import { initAuth } from './auth/store'
import router from './router'
import './index.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
void initAuth()
