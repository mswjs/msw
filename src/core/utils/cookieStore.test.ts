// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { cookieStore } from './cookieStore'

const url = 'https://example.com'

function createFakeLocalStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
  }
}

beforeAll(() => {
  Reflect.set(globalThis, 'localStorage', createFakeLocalStorage())
})

afterAll(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  cookieStore.reset()
})

it('does not crash request handling when localStorage quota is exceeded', async () => {
  const quotaError = new DOMException(
    'The quota has been exceeded.',
    'QuotaExceededError',
  )
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
    throw quotaError
  })
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  // Persisting the cookie fails because the storage quota is exceeded,
  // but that must not throw and crash the request handling pipeline.
  await expect(
    cookieStore.setCookie('name=value', url),
  ).resolves.toBeUndefined()

  // The cookie must remain available in-memory for the current session.
  expect(
    cookieStore
      .getCookies(url)
      .map((cookie) => `${cookie.key}=${cookie.value}`),
  ).toEqual(['name=value'])

  // A warning must be emitted so the failure is not silent.
  expect(warnSpy).toHaveBeenCalledTimes(1)
})

it('persists cookies to localStorage when the quota is available', async () => {
  await expect(cookieStore.setCookie('token=abc', url)).resolves.toBeUndefined()

  expect(localStorage.getItem('__msw-cookie-store__')).toContain('token')
})
