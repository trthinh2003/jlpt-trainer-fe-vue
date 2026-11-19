import { clearSession, getToken } from '@/features/auth/store/session'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const defaultTimeoutMs = 15_000
let unauthorizedHandler: (() => void) | undefined

type ApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'invalid-response'

interface RequestOptions extends RequestInit {
  timeoutMs?: number
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly kind: ApiErrorKind = 'http',
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { signal, timeoutMs = defaultTimeoutMs, ...requestOptions } = options
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    throw new RangeError('timeoutMs nằm ngoài khoảng hỗ trợ.')
  }

  const headers = new Headers(requestOptions.headers)
  const token = getToken()

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (requestOptions.body && !(requestOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const controller = new AbortController()
  const abortRequest = () => controller.abort(new ApiError(0, 'Yêu cầu đã được hủy.', 'aborted'))
  if (signal?.aborted) abortRequest()
  else signal?.addEventListener('abort', abortRequest, { once: true })

  const timer = setTimeout(() => {
    controller.abort(new ApiError(0, 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.', 'timeout'))
  }, timeoutMs)

  try {
    controller.signal.throwIfAborted()
    const response = await fetch(`${baseUrl}${path}`, { ...requestOptions, headers, signal: controller.signal })
    controller.signal.throwIfAborted()

    if (!response.ok) {
      if (response.status === 401 && token && getToken() === token &&
          path !== '/auth/login' && path !== '/auth/register') {
        clearSession()
        unauthorizedHandler?.()
      }

      throw new ApiError(response.status, await readHttpErrorMessage(response))
    }

    if (response.status === 204) return undefined as T
    const data = await response.json() as T
    controller.signal.throwIfAborted()
    return data
  } catch (error) {
    controller.signal.throwIfAborted()
    if (error instanceof ApiError) throw error
    if (error instanceof SyntaxError) {
      throw new ApiError(0, 'Phản hồi từ máy chủ không hợp lệ.', 'invalid-response')
    }
    throw new ApiError(0, 'Không thể kết nối tới máy chủ. Kiểm tra API đã chạy chưa.', 'network')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortRequest)
  }
}

async function readHttpErrorMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
    return body.error
  }

  return response.status === 429
    ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một phút rồi thử lại.'
    : 'Đã có lỗi xảy ra, vui lòng thử lại.'
}

export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Đã có lỗi xảy ra, vui lòng thử lại.'
}
