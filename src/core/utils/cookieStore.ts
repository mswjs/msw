import { invariant } from 'outvariant'
import { isNodeProcess } from 'is-node-process'
import {
  Cookie,
  CookieJar,
  MemoryCookieStore,
  MemoryCookieStoreIndex,
} from 'tough-cookie'

const storageKey = '__msw-cookie-store__'

function loadFromLocalStorage(): MemoryCookieStoreIndex {
  const json = localStorage.getItem('__msw-cookie-store__')

  if (json == null) {
    return {}
  }

  const rawCookies = JSON.parse(json) as Array<Record<string, any>>
  const cookies: MemoryCookieStoreIndex = {}
  for (const rawCookie of rawCookies) {
    const cookie = Cookie.fromJSON(rawCookie)
    if (cookie != null && cookie.domain != null && cookie.path != null) {
      cookies[cookie.domain][cookie.path][cookie.key] = cookie
    }
  }
  return cookies
}

function storeInLocalStorage(idx: MemoryCookieStoreIndex): void {
  const data = []
  for (const domain in idx) {
    for (const path in idx[domain]) {
      for (const key in idx[domain][path]) {
        data.push(idx[domain][path][key].toJSON())
      }
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(data))
}

const memoryStore = new MemoryCookieStore()
// Instead of implementing our own cookie store we simply proxy the memory store.
if (!isNodeProcess()) {
  invariant(
    typeof localStorage !== 'undefined',
    'Failed to create a WebStorageCookieStore: `localStorage` is not available in this environment. This is likely an issue with MSW. Please report it on GitHub: https://github.com/mswjs/msw/issues',
  )
  memoryStore.idx = loadFromLocalStorage()
}

const cookieJar = new CookieJar(memoryStore)

export const cookieStore = {
  setCookie(cookie: string | Cookie, url: string | undefined): void {
    if (typeof url !== 'undefined') {
      cookieJar.setCookieSync(cookie, url)
      storeInLocalStorage(memoryStore.idx)
    }
  },

  getCookiesSync(url: string): Cookie[] {
    return cookieJar.getCookiesSync(url)
  },
}
