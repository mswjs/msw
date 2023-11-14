/**
 * @vitest-environment node
 */
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://example.com/user', () => {
    return HttpResponse.error()
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('throws a network error when used with fetch', async () => {
  await expect(fetch('http://example.com/user')).rejects.toThrow(
    'Failed to fetch',
  )
})
