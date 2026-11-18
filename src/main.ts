import { createApp } from 'vue'
import App from './app/App.vue'
import { router } from './app/router'
import { setUnauthorizedHandler } from './shared/api/http'
import './styles/main.css'

setUnauthorizedHandler(() => {
  void router.replace({ name: 'login' })
})

createApp(App).use(router).mount('#app')
