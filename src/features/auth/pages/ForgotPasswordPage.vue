<script setup lang="ts">
import { ref } from 'vue'
import { getErrorMessage } from '@/shared/api/http'
import { authApi } from '../api/auth.api'
import AuthLayout from '../components/AuthLayout.vue'
import { isValidEmail } from '../validation'

const email = ref('')
const submitted = ref(false)
const isSubmitting = ref(false)
const notice = ref('')
const errorMessage = ref('')

async function onSubmit(): Promise<void> {
  if (isSubmitting.value) return
  submitted.value = true
  errorMessage.value = ''
  if (!isValidEmail(email.value)) return

  isSubmitting.value = true
  try {
    const result = await authApi.forgotPassword(email.value.trim())
    notice.value = result.message
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthLayout title="Quên mật khẩu" stamp="鍵">
    <p v-if="notice" class="muted" role="status">{{ notice }}</p>
    <form v-else novalidate @submit.prevent="onSubmit">
      <div class="field">
        <label for="reset-email">Email đã đăng ký</label>
        <input
          id="reset-email" v-model="email" type="email" autocomplete="email" maxlength="255"
          :aria-invalid="submitted && !isValidEmail(email)"
          :aria-describedby="submitted && !isValidEmail(email) ? 'reset-email-error' : undefined"
        />
        <small v-if="submitted && !isValidEmail(email)" id="reset-email-error" class="error">Email không hợp lệ.</small>
      </div>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi link đặt lại' }}
      </button>
    </form>
    <p class="switch-link"><RouterLink :to="{ name: 'login' }">Về trang đăng nhập</RouterLink></p>
  </AuthLayout>
</template>
