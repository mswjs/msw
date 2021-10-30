import * as path from 'path'
import { pageWith } from 'page-with'

test('supports redirect in a mocked response', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'redirect.mocks.ts'),
  })
  const res = await runtime.request('/login')
  const headers = await res.allHeaders()

  // Assert the original response returns redirect.
  expect(headers).toHaveProperty('location', '/user')
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(res.status()).toBe(307)

  const redirectRes = await runtime.page.waitForResponse(
    runtime.makeUrl('/user'),
  )
  const redirectStatus = redirectRes.status()
  const redirectHeaders = await redirectRes.allHeaders()
  const redirectBody = await redirectRes.json()

  // Assert redirect gets requested and mocked.
  expect(redirectStatus).toBe(200)
  expect(redirectHeaders).toHaveProperty('x-powered-by', 'msw')
  expect(redirectBody).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})
