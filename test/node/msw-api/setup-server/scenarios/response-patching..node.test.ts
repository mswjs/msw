/**
 * @jest-environment node
 */
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, http, bypass } from 'msw'
import { setupServer } from 'msw/node'

const httpServer = new HttpServer((app) => {
  app.get('/user', (req, res) => {
    res.status(200).json({ id: 101 }).end()
  })
  app.post('/user', (req, res) => {
    res.status(200).json({ id: 202 }).end()
  })
})

interface ResponseBody {
  id: number
  mocked: boolean
}

const server = setupServer(
  http.get('https://test.mswjs.io/user', async () => {
    const fetchArgs = await bypass(httpServer.http.url('/user'))
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json({
      id: body.id,
      mocked: true,
    })
  }),
  http.get('https://test.mswjs.io/complex-request', async ({ request }) => {
    const url = new URL(request.url)

    const shouldBypass = url.searchParams.get('bypass') === 'true'
    const fetchArgs = await bypass(
      new Request(httpServer.http.url('/user'), {
        method: 'POST',
      }),
    )
    const performRequest = shouldBypass
      ? () => fetch(...fetchArgs).then((res) => res.json())
      : () =>
          fetch('https://httpbin.org/post', { method: 'POST' }).then((res) =>
            res.json(),
          )

    const originalResponse = await performRequest()

    return HttpResponse.json({
      id: originalResponse.id,
      mocked: true,
    })
  }),
  http.post('https://httpbin.org/post', () => {
    return HttpResponse.json({ id: 303 })
  }),
)

beforeAll(async () => {
  await httpServer.listen()
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('returns a combination of mocked and original responses', async () => {
  const res = await fetch('https://test.mswjs.io/user')
  const { status } = res
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual<ResponseBody>({
    id: 101,
    mocked: true,
  })
})

test('bypasses a mocked request when using "bypass()"', async () => {
  const res = await fetch('https://test.mswjs.io/complex-request?bypass=true')

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual<ResponseBody>({
    id: 202,
    mocked: true,
  })
})

test('falls into the mocked request when using "fetch" directly', async () => {
  const res = await fetch('https://test.mswjs.io/complex-request')

  expect(res.status).toBe(200)
  expect(await res.json()).toEqual<ResponseBody>({
    id: 303,
    mocked: true,
  })
})
