import * as path from 'path'
import { pageWith } from 'page-with'

test('mocks response to a basic GET request', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'basic.mocks.ts'),
  })

  const res = await runtime.request('https://api.github.com/users/octocat')
  const body = await res.json()

  expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  expect(res.status()).toBe(200)
  expect(body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })
})
