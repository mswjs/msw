import * as path from 'path'
import { pageWith } from 'page-with'

test('parses request URL parameters', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'params.mocks.ts'),
  })

  const res = await runtime.request(
    'https://api.github.com/users/octocat/messages/abc-123',
  )
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    username: 'octocat',
    messageId: 'abc-123',
  })
})
