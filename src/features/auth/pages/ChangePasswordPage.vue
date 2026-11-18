<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getErrorMessage } from '@/shared/api/http'
import { authApi } from '../api/auth.api'
import AuthLayout from '../components/AuthLayout.vue'
import { clearSession } from '../store/session'
import { isValidNewPassword, newPasswordHelp } from '../validation'

const router = useRouter()
const form = reactive({ currentPassword: '', newPassword: '', confirmation: '' })
const submitted = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const currentPasswordMissing = computed(() => !form.currentPassword.trim())
const newPasswordError = computed(() => {
  if (!isValidNewPassword(form.newPassword)) return newPasswordHelp
  return form.newPassword === form.currentPassword ? 'Mật khẩu mới phải khác mật khẩu hiện tại.' : ''
})
const confirmationInvalid = computed(() => !form.confirmation || form.confirmation !== form.newPassword)

async function onSubmit(): Promise<void> {
  if (isSubmitting.value) return
  submitted.value = true
  errorMessage.value = ''
  if (currentPasswordMissing.value || newPasswordError.value || confirmationInvalid.value) return

  isSubmitting.value = true
  try {
    await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
    Object.assign(form, { currentPassword: '', newPassword: '', confirmation: '' })
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
  <AuthLayout title="Đổi mật khẩu">
    <form novalidate @submit.prevent="onSubmit">
      <div class="field">
        <label for="current-password">Mật khẩu hiện tại</label>
        <input
          id="current-password" v-model="form.currentPassword" type="password" autocomplete="current-password"
          :aria-invalid="submitted && currentPasswordMissing"
          :aria-describedby="submitted && currentPasswordMissing ? 'current-password-error' : undefined"
        />
        <small v-if="submitted && currentPasswordMissing" id="current-password-error" class="error">
          Vui lòng nhập mật khẩu hiện tại.
        </small>
      </div>
      <div class="field">
        <label for="new-password">Mật khẩu mới</label>
        <input
          id="new-password" v-model="form.newPassword" type="password" autocomplete="new-password"
          :aria-invalid="submitted && !!newPasswordError" aria-describedby="new-password-help"
        />
        <small id="new-password-help" :class="submitted && newPasswordError ? 'error' : 'muted'">
          {{ (submitted && newPasswordError) || newPasswordHelp }}
        </small>
      </div>
      <div class="field">
        <label for="confirm-password">Xác nhận mật khẩu mới</label>
        <input
          id="confirm-password" v-model="form.confirmation" type="password" autocomplete="new-password"
          :aria-invalid="submitted && confirmationInvalid"
          :aria-describedby="submitted && confirmationInvalid ? 'confirm-password-error' : undefined"
        />
        <small v-if="submitted && confirmationInvalid" id="confirm-password-error" class="error">
          Xác nhận mật khẩu mới chưa khớp.
        </small>
      </div>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Đang lưu...' : 'Lưu mật khẩu mới' }}
      </button>
    </form>
    <p class="switch-link"><RouterLink :to="{ name: 'vocabs' }">Về kho từ vựng</RouterLink></p>
  </AuthLayout>
</template>
