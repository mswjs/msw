// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.post('https://example.com/protobuf', async ({ request }) => {
    const buffer = await request.arrayBuffer()

    return new HttpResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/protobuf',
      },
    })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('responds with a "application/protobuf" mocked response', async () => {
  const payload = new Uint8Array([138, 1, 6, 10, 4, 10, 2, 32, 1])

  const response = await fetch('https://example.com/protobuf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/protobuf',
    },
    body: payload,
  })
  const body = await response.arrayBuffer()

  expect(new Uint8Array(body)).toEqual(payload)
})
