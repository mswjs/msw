import * as path from 'path'
import { pageWith } from 'page-with'

test('mocks response to a basic GET request', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'basic.mocks.ts'),
  })

  const res = await runtime.request('https://api.github.com/users/octocat')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })
})
