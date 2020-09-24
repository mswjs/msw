import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'method.mocks.ts'))
}

test('sends a mocked response to a POST request on the matching URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
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

test('does not send a mocked response to a GET request on the matching URL', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).not.toHaveProperty('mocked', true)

  return runtime.cleanup()
})
