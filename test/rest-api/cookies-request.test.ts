import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'cookies-request.mocks.ts'),
  )
  await runtime.page.evaluate(() => {
    document.cookie = 'auth-token=abc-123;'
    document.cookie = 'custom-cookie=yes;'
  })
})

afterAll(() => {
  return runtime.cleanup()
})

test('returns all document cookies in `req.cookies` for "include" credentials', async () => {
  const res = await runtime.request({
    url: `${runtime.origin}/user`,
    fetchOptions: {
      credentials: 'include',
    },
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    cookies: {
      'auth-token': 'abc-123',
      'custom-cookie': 'yes',
    },
  })
})

test('returns all document cookies in `req.cookies` for "same-origin" credentials and request to the same origin', async () => {
  const res = await runtime.request({
    url: `${runtime.origin}/user`,
    fetchOptions: {
      credentials: 'same-origin',
    },
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    cookies: {
      'auth-token': 'abc-123',
      'custom-cookie': 'yes',
    },
  })
})

test('returns no cookies in `req.cookies` for "same-origin" credentials and request to the different origin', async () => {
  const res = await runtime.request({
    url: `https://test.mswjs.io/user`,
    fetchOptions: {
      credentials: 'same-origin',
    },
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    cookies: {},
  })
})

test('returns no cookies in `req.cookies` for "omit" credentials', async () => {
  const res = await runtime.request({
    url: `${runtime.origin}/user`,
    fetchOptions: {
      credentials: 'omit',
    },
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    cookies: {},
  })
})
