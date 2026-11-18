<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../api/auth.api'
import AuthLayout from '../components/AuthLayout.vue'
import { setSession } from '../store/session'
import { isValidDisplayName, isValidEmail, isValidNewPassword, newPasswordHelp } from '../validation'
import { getErrorMessage } from '@/shared/api/http'

const router = useRouter()
const form = reactive({ displayName: '', email: '', password: '' })
const submitted = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function onSubmit(): Promise<void> {
  if (isSubmitting.value) return
  submitted.value = true
  errorMessage.value = ''
  if (!isValidDisplayName(form.displayName) || !isValidEmail(form.email) || !isValidNewPassword(form.password)) return

  isSubmitting.value = true
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
        <input
          id="displayName" v-model="form.displayName" type="text" autocomplete="name"
          :aria-invalid="submitted && !isValidDisplayName(form.displayName)"
          :aria-describedby="submitted && !isValidDisplayName(form.displayName) ? 'displayName-error' : undefined"
        />
        <small v-if="submitted && !isValidDisplayName(form.displayName)" id="displayName-error" class="error">
          Tên hiển thị phải có từ 1 đến 100 ký tự.
        </small>
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="email" />
        <small v-if="submitted && !isValidEmail(form.email)" class="error">Email không hợp lệ.</small>
      </div>
      <div class="field">
        <label for="password">Mật khẩu</label>
        <input
          id="password" v-model="form.password" type="password" autocomplete="new-password"
          aria-describedby="password-rules"
          :aria-invalid="submitted && !isValidNewPassword(form.password)"
        />
        <small id="password-rules" :class="submitted && !isValidNewPassword(form.password) ? 'error' : 'muted'">
          {{ newPasswordHelp }}
        </small>
      </div>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang đăng ký...' : 'Đăng ký' }}
      </button>
    </form>
    <p class="switch-link">Đã có tài khoản? <RouterLink to="/login">Đăng nhập</RouterLink></p>
  </AuthLayout>
</template>
