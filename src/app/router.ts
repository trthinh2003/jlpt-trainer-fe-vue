import { createRouter, createWebHistory } from 'vue-router'
import { isAuthenticated } from '@/features/auth/store/session'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: { name: 'vocabs' } },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/features/auth/pages/LoginPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/features/auth/pages/RegisterPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/vocabs',
      name: 'vocabs',
      component: () => import('@/features/vocab/pages/VocabPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('@/features/review/pages/ReviewPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/account/password',
      name: 'change-password',
      component: () => import('@/features/auth/pages/ChangePasswordPage.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'vocabs' }
  }
})
