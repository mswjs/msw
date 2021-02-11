import * as path from 'path'
import { pageWith } from 'page-with'

async function createRuntime() {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'cookies-request.mocks.ts'),
  })
  await runtime.page.evaluate(() => {
    document.cookie = 'auth-token=abc-123;'
    document.cookie = 'custom-cookie=yes;'
  })
  return runtime
}

test('returns all document cookies in "req.cookies" for "include" credentials', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/user', {
    credentials: 'include',
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

test('returns all document cookies in "req.cookies" for "same-origin" credentials and request to the same origin', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/user', {
    credentials: 'same-origin',
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

test('returns no cookies in "req.cookies" for "same-origin" credentials and request to a different origin', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://test.mswjs.io/user', {
    credentials: 'same-origin',
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    cookies: {},
  })
})

test('returns no cookies in "req.cookies" for "omit" credentials', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/user', {
    credentials: 'omit',
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    cookies: {},
  })
})
