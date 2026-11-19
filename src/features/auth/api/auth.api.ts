import { request } from '@/shared/api/http'
import type { AccountCapabilities, AuthResult, ChangePasswordRequest, LoginRequest, RegisterRequest } from '../types'

export const authApi = {
  login(payload: LoginRequest): Promise<AuthResult> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
  },
  register(payload: RegisterRequest): Promise<AuthResult> {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
  },
  getCurrentAccount(): Promise<AccountCapabilities> {
    return request('/auth/me')
  },
  changePassword(payload: ChangePasswordRequest): Promise<void> {
    return request('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) })
  },
  forgotPassword(email: string): Promise<{ message: string }> {
    return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
  },
  resetPassword(token: string, newPassword: string): Promise<void> {
    return request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) })
  },
}
