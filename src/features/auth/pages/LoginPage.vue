<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api/auth.api'
import AuthLayout from '../components/AuthLayout.vue'
import { setSession } from '../store/session'
import { isValidEmail } from '../validation'
import { getErrorMessage } from '@/shared/api/http'

const router = useRouter()
const route = useRoute()
const form = reactive({ email: '', password: '' })
const submitted = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function onSubmit(): Promise<void> {
  submitted.value = true
  if (!isValidEmail(form.email) || form.password.length < 6) return

  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const result = await authApi.login({ email: form.email.trim(), password: form.password })
    setSession(result)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//')
      ? route.query.redirect
      : '/vocabs'
    await router.replace(redirect)
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthLayout title="Đăng nhập" stamp="験">
    <form novalidate @submit.prevent="onSubmit">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="email" />
        <small v-if="submitted && !isValidEmail(form.email)" class="error">Email không hợp lệ.</small>
      </div>
      <div class="field">
        <label for="password">Mật khẩu</label>
        <input id="password" v-model="form.password" type="password" autocomplete="current-password" />
        <small v-if="submitted && form.password.length < 6" class="error">Mật khẩu tối thiểu 6 ký tự.</small>
      </div>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập' }}
      </button>
    </form>
    <p class="switch-link">Chưa có tài khoản? <RouterLink to="/register">Đăng ký ngay</RouterLink></p>
  </AuthLayout>
</template>
