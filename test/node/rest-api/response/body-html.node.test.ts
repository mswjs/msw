/**
 * @vitest-environment node
 */
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://localhost/html', () => {
    return HttpResponse.html(`
<p class="user" id="abc-123">
  Jane Doe
</p>`)
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('responds with an HTML response body', async () => {
  const res = await fetch('http://localhost/html')
  const text = await res.text()

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('text/html')
  expect(text).toEqual(`
<p class="user" id="abc-123">
  Jane Doe
</p>`)
})
