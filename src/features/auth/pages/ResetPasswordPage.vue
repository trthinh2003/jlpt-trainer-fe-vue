<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getErrorMessage } from '@/shared/api/http'
import { authApi } from '../api/auth.api'
import AuthLayout from '../components/AuthLayout.vue'
import { clearSession } from '../store/session'
import { isValidNewPassword, newPasswordHelp } from '../validation'

const route = useRoute()
const router = useRouter()
const token = new URLSearchParams(route.hash.slice(1)).get('token')
const hasValidToken = token !== null && /^[A-F0-9]{64}$/.test(token)
if (route.hash) void router.replace({ name: 'reset-password' })

const form = reactive({ newPassword: '', confirmation: '' })
const submitted = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function onSubmit(): Promise<void> {
  if (isSubmitting.value || !hasValidToken) return
  submitted.value = true
  errorMessage.value = ''
  if (!isValidNewPassword(form.newPassword) || form.newPassword !== form.confirmation) return

  isSubmitting.value = true
  try {
    await authApi.resetPassword(token, form.newPassword)
    clearSession()
    await router.replace({ name: 'login', query: { passwordChanged: '1' } })
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthLayout title="Đặt lại mật khẩu" stamp="鍵">
    <p v-if="!hasValidToken" class="error" role="alert">Liên kết đặt lại mật khẩu không hợp lệ.</p>
    <form v-else novalidate @submit.prevent="onSubmit">
      <div class="field">
        <label for="new-password">Mật khẩu mới</label>
        <input
          id="new-password" v-model="form.newPassword" type="password" autocomplete="new-password"
          aria-describedby="new-password-help" :aria-invalid="submitted && !isValidNewPassword(form.newPassword)"
        />
        <small id="new-password-help" :class="submitted && !isValidNewPassword(form.newPassword) ? 'error' : 'muted'">
          {{ newPasswordHelp }}
        </small>
      </div>
      <div class="field">
        <label for="confirm-password">Xác nhận mật khẩu mới</label>
        <input
          id="confirm-password" v-model="form.confirmation" type="password" autocomplete="new-password"
          :aria-invalid="submitted && form.confirmation !== form.newPassword"
          :aria-describedby="submitted && form.confirmation !== form.newPassword ? 'confirm-reset-error' : undefined"
        />
        <small v-if="submitted && form.confirmation !== form.newPassword" id="confirm-reset-error" class="error">
          Xác nhận mật khẩu mới chưa khớp.
        </small>
      </div>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang lưu...' : 'Lưu mật khẩu mới' }}
      </button>
    </form>
    <p class="switch-link"><RouterLink :to="{ name: 'forgot-password' }">Yêu cầu link mới</RouterLink></p>
  </AuthLayout>
</template>
