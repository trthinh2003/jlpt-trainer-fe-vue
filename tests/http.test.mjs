import assert from 'node:assert/strict'
import { after, before, beforeEach, test } from 'node:test'
import { createServer } from 'vite'

let vite, http, session
const storage = new Map()
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

before(async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
  })

  vite = await createServer({ server: { middlewareMode: true, ws: false, watch: null } })
  http = await vite.ssrLoadModule('/src/shared/api/http.ts')
  session = await vite.ssrLoadModule('/src/features/auth/store/session.ts')
})

beforeEach(() => {
  session.clearSession()
  http.setUnauthorizedHandler(() => {})
})

after(async () => {
  await vite?.close()
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
})

function waitForAbort(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason)
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  })
}

function signIn(token) {
  session.setSession({ userId: token, email: 'test@example.invalid', displayName: 'Test', token })
}

test('times out while waiting for the response body', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    const response = new Response('{}')
    t.mock.method(response, 'json', () => waitForAbort(signal))
    return response
  })

  await assert.rejects(http.request('/vocabs', { timeoutMs: 20 }), { name: 'ApiError', kind: 'timeout' })
})

test('distinguishes cancellation from network errors', async t => {
  const controller = new AbortController()
  const mockedFetch = t.mock.method(globalThis, 'fetch', (_url, { signal }) => waitForAbort(signal))
  const pending = http.request('/vocabs', { signal: controller.signal })
  controller.abort()

  await assert.rejects(pending, { name: 'ApiError', kind: 'aborted' })
  mockedFetch.mock.mockImplementation(async () => { throw new TypeError('offline') })
  await assert.rejects(http.request('/vocabs'), { name: 'ApiError', kind: 'network' })
})

test('skips dispatch when the caller already cancelled', async t => {
  const controller = new AbortController()
  controller.abort()
  const mockedFetch = t.mock.method(globalThis, 'fetch')

  await assert.rejects(http.request('/vocabs', { signal: controller.signal }), { kind: 'aborted' })
  assert.equal(mockedFetch.mock.callCount(), 0)
})

test('keeps a new session when the old token receives 401', async t => {
  let respond
  let redirects = 0
  const response = new Promise(resolve => { respond = resolve })
  t.mock.method(globalThis, 'fetch', (_url, { headers }) => {
    assert.equal(headers.get('Authorization'), 'Bearer old-token')
    return response
  })
  http.setUnauthorizedHandler(() => { redirects++ })
  signIn('old-token')
  const pending = http.request('/vocabs')
  signIn('new-token')
  respond(new Response(null, { status: 401 }))

  await assert.rejects(pending, { kind: 'http', status: 401 })
  assert.equal(session.getToken(), 'new-token')
  assert.equal(redirects, 0)
})

test('preserves the session on login failure and clears it on a protected 401', async t => {
  let redirects = 0
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 401 }))
  http.setUnauthorizedHandler(() => { redirects++ })
  signIn('current-token')

  await assert.rejects(http.request('/auth/login'), { status: 401 })
  assert.equal(session.getToken(), 'current-token')
  assert.equal(redirects, 0)

  await assert.rejects(http.request('/auth/me'), { status: 401 })
  assert.equal(session.getToken(), null)
  assert.equal(redirects, 1)
})
