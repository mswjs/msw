/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { createServer, ServerApi } from '@open-draft/test-server'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

let httpServer: ServerApi

interface ResponseBody {
  id: number
  mocked: boolean
}

const server = setupServer(
  rest.get<never, never, ResponseBody>(
    'https://test.mswjs.io/user',
    async (req, res, ctx) => {
      const originalResponse = await ctx.fetch(httpServer.http.makeUrl('/user'))
      const body = await originalResponse.json()

      return res(
        ctx.json({
          id: body.id,
          mocked: true,
        }),
      )
    },
  ),
  rest.get<never, never, ResponseBody>(
    'https://test.mswjs.io/complex-request',
    async (req, res, ctx) => {
      const shouldBypass = req.url.searchParams.get('bypass') === 'true'
      const performRequest = shouldBypass
        ? () =>
            ctx
              .fetch(httpServer.http.makeUrl('/user'), { method: 'POST' })
              .then((res) => res.json())
        : () =>
            fetch('https://httpbin.org/post', { method: 'POST' }).then((res) =>
              res.json(),
            )
      const originalResponse = await performRequest()

      return res(
        ctx.json({
          id: originalResponse.id,
          mocked: true,
        }),
      )
    },
  ),
  rest.post('https://httpbin.org/post', (req, res, ctx) => {
    return res(ctx.json({ id: 303 }))
  }),
)

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.get('/user', (req, res) => {
      res.status(200).json({ id: 101 }).end()
    })
    app.post('/user', (req, res) => {
      res.status(200).json({ id: 202 }).end()
    })
  })

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
  const { status, headers } = res
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers.get('x-powered-by')).toBe('msw')
  expect(body).toEqual<ResponseBody>({
    id: 101,
    mocked: true,
  })
})

test('bypasses a mocked request when using "ctx.fetch"', async () => {
  const res = await fetch('https://test.mswjs.io/complex-request?bypass=true')

  expect(res.status).toBe(200)
  expect(res.headers.get('x-powered-by')).toBe('msw')
  expect(await res.json()).toEqual<ResponseBody>({
    id: 202,
    mocked: true,
  })
})

test('falls into the mocked request when using "fetch" directly', async () => {
  const res = await fetch('https://test.mswjs.io/complex-request')

  expect(res.status).toBe(200)
  expect(res.headers.get('x-powered-by')).toBe('msw')
  expect(await res.json()).toEqual<ResponseBody>({
    id: 303,
    mocked: true,
  })
})
