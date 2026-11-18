import { request } from '@/shared/api/http'
import type { AuthResult, LoginRequest, RegisterRequest } from '../types'

export const authApi = {
  login(payload: LoginRequest): Promise<AuthResult> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
  },
  register(payload: RegisterRequest): Promise<AuthResult> {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
  },
}
