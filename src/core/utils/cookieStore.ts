import { invariant } from 'outvariant'
import { isNodeProcess } from 'is-node-process'
import toughCookie, {
  type Cookie as CookieInstance,
} from '@bundled-es-modules/tough-cookie'

const { Cookie, CookieJar, Store, MemoryCookieStore, domainMatch, pathMatch } =
  toughCookie

/**
 * Custom cookie store that uses the Web Storage API.
 * @see https://github.com/expo/tough-cookie-web-storage-store
 */
class WebStorageCookieStore extends Store {
  private storage: Storage
  private storageKey: string

  constructor() {
    super()

    invariant(
      typeof localStorage !== 'undefined',
      'Failed to create a WebStorageCookieStore: `localStorage` is not available in this environment. This is likely an issue with MSW. Please report it on GitHub: https://github.com/mswjs/msw/issues',
    )

    this.synchronous = true
    this.storage = localStorage
    this.storageKey = '__msw-cookie-store__'
  }

  findCookie(
    domain: string,
    path: string,
    key: string,
    callback: (error: Error | null, cookie: CookieInstance | null) => void,
  ): void {
    try {
      const store = this.getStore()
      const cookies = this.filterCookiesFromList(store, { domain, path, key })
      callback(null, cookies[0] || null)
    } catch (error) {
      if (error instanceof Error) {
        callback(error, null)
      }
    }
  }

  findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain: boolean,
    callback: (error: Error | null, cookie: Array<CookieInstance>) => void,
  ): void {
    if (!domain) {
      callback(null, [])
      return
    }

    try {
      const store = this.getStore()
      const results = this.filterCookiesFromList(store, {
        domain,
        path,
      })
      callback(null, results)
    } catch (error) {
      if (error instanceof Error) {
        callback(error, [])
      }
    }
  }

  putCookie(
    cookie: CookieInstance,
    callback: (error: Error | null) => void,
  ): void {
    try {
      // Never set cookies with `maxAge` of `0`.
      if (cookie.maxAge === 0) {
        return
      }

      const store = this.getStore()
      store.push(cookie)
      this.updateStore(store)
    } catch (error) {
      if (error instanceof Error) {
        callback(error)
      }
    }
  }

  updateCookie(
    oldCookie: CookieInstance,
    newCookie: CookieInstance,
    callback: (error: Error | null) => void,
  ): void {
    /**
     * If updating a cookie with `maxAge` of `0`, remove it from the store.
     * Otherwise, two cookie entries will be created.
     * @see https://github.com/mswjs/msw/issues/2272
     */
    if (newCookie.maxAge === 0) {
      this.removeCookie(
        newCookie.domain || '',
        newCookie.path || '',
        newCookie.key,
        callback,
      )
      return
    }

    this.putCookie(newCookie, callback)
  }

  removeCookie(
    domain: string,
    path: string,
    key: string,
    callback: (error: Error | null) => void,
  ): void {
    try {
      const store = this.getStore()
      const nextStore = this.deleteCookiesFromList(store, { domain, path, key })
      this.updateStore(nextStore)
      callback(null)
    } catch (error) {
      if (error instanceof Error) {
        callback(error)
      }
    }
  }

  removeCookies(
    domain: string,
    path: string,
    callback: (error: Error | null) => void,
  ): void {
    try {
      const store = this.getStore()
      const nextStore = this.deleteCookiesFromList(store, { domain, path })
      this.updateStore(nextStore)
      callback(null)
    } catch (error) {
      if (error instanceof Error) {
        callback(error)
      }
    }
  }

  getAllCookies(
    callback: (error: Error | null, cookie: Array<CookieInstance>) => void,
  ): void {
    try {
      callback(null, this.getStore())
    } catch (error) {
      if (error instanceof Error) {
        callback(error, [])
      }
    }
  }

  private getStore(): Array<CookieInstance> {
    try {
      const json = this.storage.getItem(this.storageKey)

      if (json == null) {
        return []
      }

      const rawCookies = JSON.parse(json) as Array<Record<string, any>>
      const cookies: Array<CookieInstance> = []
      for (const rawCookie of rawCookies) {
        const cookie = Cookie.fromJSON(rawCookie)
        if (cookie != null) {
          cookies.push(cookie)
        }
      }
      return cookies
    } catch {
      return []
    }
  }

  private updateStore(nextStore: Array<CookieInstance>) {
    this.storage.setItem(
      this.storageKey,
      JSON.stringify(nextStore.map((cookie) => cookie.toJSON())),
    )
  }

  private filterCookiesFromList(
    cookies: Array<CookieInstance>,
    matches: { domain?: string; path?: string; key?: string },
  ): Array<CookieInstance> {
    const result: Array<CookieInstance> = []

    for (const cookie of cookies) {
      if (matches.domain && !domainMatch(matches.domain, cookie.domain || '')) {
        continue
      }

      if (matches.path && !pathMatch(matches.path, cookie.path || '')) {
        continue
      }

      if (matches.key && cookie.key !== matches.key) {
        continue
      }

      result.push(cookie)
    }

    return result
  }

  private deleteCookiesFromList(
    cookies: Array<CookieInstance>,
    matches: { domain?: string; path?: string; key?: string },
  ) {
    const matchingCookies = this.filterCookiesFromList(cookies, matches)
    return cookies.filter((cookie) => !matchingCookies.includes(cookie))
  }
}

const store = isNodeProcess()
  ? new MemoryCookieStore()
  : new WebStorageCookieStore()

export const cookieStore = new CookieJar(store)
