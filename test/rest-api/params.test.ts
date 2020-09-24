import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

test('parses request URL parameters', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'params.mocks.ts'),
  )

  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat/messages/abc-123',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    username: 'octocat',
    messageId: 'abc-123',
  })

  return runtime.cleanup()
})
