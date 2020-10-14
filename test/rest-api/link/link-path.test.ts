import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'link-path.mocks.ts'))
}

test('scopes relative request under the given base', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    subdomain: 'api',
    name: 'John Maverick',
    originalUsername: 'octocat',
  })

  return runtime.cleanup()
})

test('bypasses a matching path with a mismatching base', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://different.domain/users/octocat').catch(() => null),
  )

  expect(res).toBeNull()

  return runtime.cleanup()
})

test('handles RegExp request handler URL with the given string base', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://test.github.com/repos/mswjs/msw',
    fetchOptions: {
      method: 'POST',
    },
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    subdomain: 'test',
    mocked: true,
  })

  return runtime.cleanup()
})

test('bypasses a matching RegExp with a mismatching base', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://different.domain/repos/').catch(() => null),
  )

  expect(res).toBeNull()

  return runtime.cleanup()
})
