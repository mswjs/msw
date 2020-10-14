import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'link-string.mocks.ts'))
}

test('matches a relative request with a matching base', async () => {
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
    name: 'John Maverick',
    originalUsername: 'octocat',
  })

  return runtime.cleanup()
})

test('bypasses matching relative path with a mismatching base', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://different.domain/users/octocat').catch(() => null),
  )

  expect(res).toBeNull()

  return runtime.cleanup()
})

test('matches a RegExp request handler URL with a matching base', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://api.github.com/repos/mswjs/msw',
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
    mocked: true,
  })

  return runtime.cleanup()
})

test('bypasses matching RegExp with a mismatching base', async () => {
  const runtime = await createRuntime()

  const res = await runtime.page.evaluate(() =>
    fetch('https://different.domain/repos/').catch(() => null),
  )

  expect(res).toBeNull()

  return runtime.cleanup()
})
