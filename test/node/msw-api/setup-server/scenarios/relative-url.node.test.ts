// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  /**
   * @note Although relative URLs do not exist in Node.js,
   * MSW mustn't throw if you define one. It simply won't ever match.
   */
  http.get('/books', () => {
    return HttpResponse.json([1, 2, 3])
  }),
  http.get('https://api.backend.com/path', () => {
    return HttpResponse.json({ success: true })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('does not throw on relative paths in request handlers in Node.js', async () => {
  const response = await fetch('https://api.backend.com/path')
  await expect(response.json()).resolves.toEqual({ success: true })
})
