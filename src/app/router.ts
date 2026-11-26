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
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/features/auth/pages/ForgotPasswordPage.vue'),
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/features/auth/pages/ResetPasswordPage.vue'),
    },
    {
      path: '/vocabs',
      name: 'vocabs',
      component: () => import('@/features/vocab/pages/VocabPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/kanjis',
      name: 'kanjis',
      component: () => import('@/features/catalog/pages/CatalogBrowsePage.vue'),
      props: { kind: 'kanji' },
      meta: { requiresAuth: true },
    },
    {
      path: '/grammar',
      name: 'grammar',
      component: () => import('@/features/catalog/pages/CatalogBrowsePage.vue'),
      props: { kind: 'grammar' },
      meta: { requiresAuth: true },
    },
    {
      path: '/audio-lessons',
      name: 'audio-lessons',
      component: () => import('@/features/audio-lessons/pages/AudioLessonsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/video-lessons',
      name: 'video-lessons',
      component: () => import('@/features/video-lessons/pages/VideoLessonsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('@/features/review/pages/ReviewPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/review/cards',
      name: 'study-cards',
      component: () => import('@/features/review/pages/StudyCardsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/account/password',
      name: 'change-password',
      component: () => import('@/features/auth/pages/ChangePasswordPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/mock-tests',
      name: 'mock-tests',
      component: () => import('@/features/mock-test/pages/MockTestsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/mock-tests/attempts/:id',
      name: 'mock-test-attempt',
      component: () => import('@/features/mock-test/pages/MockTestAttemptPage.vue'),
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/mock-tests/results/:id',
      name: 'mock-test-result',
      component: () => import('@/features/mock-test/pages/MockTestResultPage.vue'),
      meta: { requiresAuth: true },
      props: true,
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
