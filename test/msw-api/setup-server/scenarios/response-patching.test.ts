/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://test.mswjs.io/user', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch('https://httpbin.org/get')

    return res(
      ctx.json({
        url: originalResponse.url,
        mocked: true,
      }),
    )
  }),
  rest.get('https://test.mswjs.io/complex-request', async (req, res, ctx) => {
    const bypass = req.url.searchParams.get('bypass')
    const shouldBypass = bypass === 'true'
    const performRequest = shouldBypass
      ? () => ctx.fetch('https://httpbin.org/post', { method: 'POST' })
      : () =>
          fetch('https://httpbin.org/post', { method: 'POST' }).then((res) =>
            res.json(),
          )
    const originalResponse = await performRequest()

    return res(
      ctx.json({
        url: originalResponse.url,
        mocked: true,
      }),
    )
  }),
  rest.post('https://httpbin.org/post', (req, res, ctx) => {
    return res(ctx.json({ url: 'completely-mocked' }))
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('returns a combination of mocked and original responses', async () => {
  const res = await fetch('https://test.mswjs.io/user')
  const { status, headers } = res
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers.get('x-powered-by')).toBe('msw')
  expect(body).toEqual({
    url: 'https://httpbin.org/get',
    mocked: true,
  })
})

test('bypasses a mocked request when using "ctx.fetch"', async () => {
  const res = await fetch('https://test.mswjs.io/complex-request?bypass=true')
  const { status, headers } = res
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers.get('x-powered-by')).toBe('msw')
  expect(body).toEqual({
    url: 'https://httpbin.org/post',
    mocked: true,
  })
})

test('falls into the mocked request when using "fetch" directly', async () => {
  const res = await fetch('https://test.mswjs.io/complex-request')
  const { status, headers } = res
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers.get('x-powered-by')).toBe('msw')
  expect(body).toEqual({
    url: 'completely-mocked',
    mocked: true,
  })
})
