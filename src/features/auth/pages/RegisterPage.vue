<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/auth.api'
import AuthLayout from '../components/AuthLayout.vue'
import { setSession } from '../store/session'
import { isValidEmail } from '../validation'
import { getErrorMessage } from '@/shared/api/http'

const router = useRouter()
const form = reactive({ displayName: '', email: '', password: '' })
const submitted = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function onSubmit(): Promise<void> {
  submitted.value = true
  if (form.displayName.trim().length < 2 || !isValidEmail(form.email) || form.password.length < 6) return

  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const result = await authApi.register({
      displayName: form.displayName.trim(),
      email: form.email.trim(),
      password: form.password,
    })
    setSession(result)
    await router.replace({ name: 'vocabs' })
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthLayout title="Đăng ký" stamp="申">
    <form novalidate @submit.prevent="onSubmit">
      <div class="field">
        <label for="displayName">Tên hiển thị</label>
        <input id="displayName" v-model="form.displayName" type="text" autocomplete="name" />
        <small v-if="submitted && form.displayName.trim().length < 2" class="error">Tên hiển thị tối thiểu 2 ký tự.</small>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="email" />
        <small v-if="submitted && !isValidEmail(form.email)" class="error">Email không hợp lệ.</small>
      </div>
      <div class="field">
        <label for="password">Mật khẩu</label>
        <input id="password" v-model="form.password" type="password" autocomplete="new-password" />
        <small v-if="submitted && form.password.length < 6" class="error">Mật khẩu tối thiểu 6 ký tự.</small>
      </div>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang đăng ký...' : 'Đăng ký' }}
      </button>
    </form>
    <p class="switch-link">Đã có tài khoản? <RouterLink to="/login">Đăng nhập</RouterLink></p>
  </AuthLayout>
</template>
