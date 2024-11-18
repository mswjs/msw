import { isNodeProcess } from 'is-node-process'
import { invariant } from 'outvariant'
import {
  Cookie,
  CookieJar,
  MemoryCookieStore,
  MemoryCookieStoreIndex,
} from 'tough-cookie'

type SimpleCookie = {
  asString: string
  key: string
  value: string
}

class SimpleStore {
  private readonly storageKey = '__msw-cookie-store__'
  private readonly jar: CookieJar
  private readonly memoryStore: MemoryCookieStore

  constructor() {
    const memoryStore = new MemoryCookieStore()
    if (!isNodeProcess()) {
      invariant(
        typeof localStorage !== 'undefined',
        'Failed to create a WebStorageCookieStore: `localStorage` is not available in this environment. This is likely an issue with MSW. Please report it on GitHub: https://github.com/mswjs/msw/issues',
      )
    }
    memoryStore.idx = this.loadFromLocalStorage()

    this.jar = new CookieJar(memoryStore)
    this.memoryStore = memoryStore
  }

  private loadFromLocalStorage(): MemoryCookieStoreIndex {
    if (typeof localStorage === 'undefined') {
      return {}
    }

    const json = localStorage.getItem(this.storageKey)

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

  private storeInLocalStorage(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    const data = []
    const idx = this.memoryStore.idx
    for (const domain in idx) {
      for (const path in idx[domain]) {
        for (const key in idx[domain][path]) {
          data.push(idx[domain][path][key].toJSON())
        }
      }
    }
    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  async setCookie(cookie: string, url: string): Promise<void> {
    await this.jar.setCookie(cookie, url)
    this.storeInLocalStorage()
    return
  }

  getCookies(url: string): SimpleCookie[] {
    return this.jar.getCookiesSync(url).map((c: Cookie) => ({
      key: c.key,
      value: c.value,
      asString: c.toString(),
    }))
  }
}

export const cookieStore = new SimpleStore()
