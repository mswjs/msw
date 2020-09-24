import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

test('supports redirect in a mocked response', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'redirect.mocks.ts'),
  )
  const res = await runtime.request({
    url: `${runtime.origin}/login`,
  })

  // Assert the original response returns redirect.
  expect(res.headers()).toHaveProperty('location', '/user')
  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(res.status()).toBe(307)

  const redirectRes = await runtime.page.waitForResponse(
    `${runtime.origin}/user`,
  )
  const redirectStatus = redirectRes.status()
  const redirectHeaders = redirectRes.headers()
  const redirectBody = await redirectRes.json()

  // Assert redirect gets requested and mocked.
  expect(redirectStatus).toBe(200)
  expect(redirectHeaders).toHaveProperty('x-powered-by', 'msw')
  expect(redirectBody).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })

  return runtime.cleanup()
})
