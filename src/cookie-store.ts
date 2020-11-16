import { Cookie } from 'set-cookie-parser'

const cookieStore = new Map<string, Map<Cookie['name'], Omit<Cookie, 'name'>>>()

const storedCookieStore = localStorage.getItem('_MSW_COOKIE_STORE')

if (storedCookieStore) {
  const parsedCookieStore: [
    string,
    [string, Omit<Cookie, 'name'>][],
  ][] = JSON.parse(storedCookieStore)

  parsedCookieStore.forEach(([origin, cookie]) =>
    cookieStore.set(origin, new Map(cookie)),
  )
}

export { cookieStore }
