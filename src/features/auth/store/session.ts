import { computed, readonly, shallowRef } from 'vue'
import type { AuthResult } from '../types'

const TOKEN_KEY = 'jlpt_token'
const USER_KEY = 'jlpt_user'

function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function readSession(): AuthResult | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    if (!token || !raw) return null

    const user: unknown = JSON.parse(raw)
    if (
      typeof user !== 'object' ||
      user === null ||
      !('token' in user) ||
      user.token !== token ||
      !('userId' in user) ||
      !('email' in user) ||
      !('displayName' in user)
    ) {
      clearStoredSession()
      return null
    }
    return user as AuthResult
  } catch {
    clearStoredSession()
    return null
  }
}

const currentUser = shallowRef<AuthResult | null>(readSession())
export const isAuthenticated = computed(() => currentUser.value !== null)

export function useSession() {
  return { currentUser: readonly(currentUser), isAuthenticated }
}

export function getToken(): string | null {
  return currentUser.value?.token ?? null
}

export function setSession(result: AuthResult): void {
  localStorage.setItem(TOKEN_KEY, result.token)
  localStorage.setItem(USER_KEY, JSON.stringify(result))
  currentUser.value = result
}

export function clearSession(): void {
  clearStoredSession()
  currentUser.value = null
}
