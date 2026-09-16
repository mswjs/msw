// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get<{ url: string }>(
    'https://test.mswjs.io/reflect-url/:url',
    ({ params }) => {
      return HttpResponse.json({ url: params.url })
    },
  ),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('decodes url componets', async () => {
  const url = 'http://example.com:5001/example'

  const res = await fetch(
    `https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`,
  )

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({
    url,
  })
})
