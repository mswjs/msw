import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

test('mocks response to a basic GET request', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'basic.mocks.ts'),
  )

  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })
  const body = await res.json()

  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(res.status()).toBe(200)
  expect(body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })

  return runtime.cleanup()
})
