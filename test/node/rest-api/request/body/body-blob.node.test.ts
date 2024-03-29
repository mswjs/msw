// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.post('http://localhost/blob', async ({ request }) => {
    return new HttpResponse(await request.blob(), {
      headers: request.headers,
    })
  }),
)

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('sends a request blob and reads the request body as blob', async () => {
  const blob = new Blob(['Wello', 'world'], {
    type: 'application/octet-stream',
  })
  const response = await fetch('http://localhost/blob', {
    method: 'POST',
    body: blob,
  })

  expect(await response.blob()).toEqual(blob)
})

it('sends a request blob with control characters', async () => {
  /**
   * @see https://github.com/mswjs/msw/issues/1859
   */
  const blobWithControlCharacters = new Blob(
    [
      `0.1.0       .@H73baaaf2-7e54-11ee-a6d4-352ccf5c8f70python-3&Z7999 = lambda x: y
  Z7999�Z8002 = lambda Z8002K1: return {'Z1K1': 'Z8000', 'Z8000K1': str(Z8002K1)}
  Z8002Z7999K1ZZ8001 = lambda _: return int(Z8001K1.Z8000K1)
  Z8001Z1K1
  Z8000Z8000K15  `,
    ],
    { type: 'application/octet-stream' },
  )
  const response = await fetch('http://localhost/blob', {
    method: 'POST',
    body: blobWithControlCharacters,
  })

  expect(await response.blob()).toEqual(blobWithControlCharacters)
})
