import { clearSession, getToken } from '@/features/auth/store/session'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
let unauthorizedHandler: (() => void) | undefined

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'Không thể kết nối tới máy chủ. Kiểm tra API đã chạy chưa.')
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
      clearSession()
      unauthorizedHandler?.()
    }

    let message = 'Đã có lỗi xảy ra, vui lòng thử lại.'
    try {
      const body: unknown = await response.json()
      if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
        message = body.error
      }
    } catch {
      // Some API errors have no JSON body.
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
