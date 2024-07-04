/**
 * @vitest-environment jsdom
 */
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { clearCookies } from '../../../support/utils'

const server = setupServer(http.all('*', () => new HttpResponse()))

function makeRequestAndGetHandlerCookies(input: string, init?: RequestInit) {
  const cookiesPromise = new Promise((resolve) => {
    server.use(http.get(input, ({ cookies }) => resolve(cookies)))
  })

  fetch(input, init)
  return cookiesPromise
}

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  clearCookies()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('returns empty object if no cookies are set on the document', async () => {
  await expect(makeRequestAndGetHandlerCookies('/')).resolves.toEqual({})
})

it('returns empty object if "credentials" is "omit"', async () => {
  document.cookie = 'a=1'

  await expect(
    makeRequestAndGetHandlerCookies('/', { credentials: 'omit' }),
  ).resolves.toEqual({})
})

it('returns empty object if "credentials" is "same-origin" and the request is cross-origin', async () => {
  // Cookies are set on "http://localhost".
  document.cookie = 'a=1'

  await expect(
    makeRequestAndGetHandlerCookies('https://api.mswjs.io/', {
      credentials: 'same-origin',
    }),
  ).resolves.toEqual({})
})

it('returns cookies for same-origin request if "credentials" is "include"', async () => {
  document.cookie = 'a=1'

  await expect(
    makeRequestAndGetHandlerCookies('/', { credentials: 'include' }),
  ).resolves.toEqual({ a: '1' })
})

it('returns cookies for cross-origin request if "credentials" is "include"', async () => {
  document.cookie = 'a=1'

  await expect(
    makeRequestAndGetHandlerCookies('https://api.mswjs.io', {
      credentials: 'include',
    }),
  ).resolves.toEqual({ a: '1' })
})

it('returns an empty object if request URL does not match cookie "path"', async () => {
  document.cookie = 'a=1; path=/cart;'

  await expect(makeRequestAndGetHandlerCookies('/user')).resolves.toEqual({})
})

it('returns cookies for the request URL matching the cookie "path" (root)', async () => {
  document.cookie = 'a=1; path=/;'

  await expect(makeRequestAndGetHandlerCookies('/')).resolves.toEqual({
    a: '1',
  })
  await expect(
    makeRequestAndGetHandlerCookies('/nested/path'),
  ).resolves.toEqual({
    a: '1',
  })
})

it.only('returns cookies for the request URL matching the cookie "path" (nested)', async () => {
  // location.href = 'http://localhost/cart'
  // const documentUrl = new URL('http://localhost/cart')
  // Object.defineProperty(globalThis, 'location', {
  //   value: {
  //     url: documentUrl.href,
  //     origin: documentUrl.origin,
  //   },
  // })

  document.cookie = 'a=1; path=/cart;'

  console.log('cookies?', document.cookie)

  await expect(makeRequestAndGetHandlerCookies('/cart')).resolves.toEqual({
    a: '1',
  })
  await expect(
    makeRequestAndGetHandlerCookies('/cart/nested'),
  ).resolves.toEqual({
    a: '1',
  })
})
