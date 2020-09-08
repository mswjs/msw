/**
 * @jest-environment node
 */
import * as http from 'http'
import { AddressInfo } from 'net'
import * as express from 'express'
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

let actualServer: http.Server

function getServerUrl() {
  const { port } = actualServer.address() as AddressInfo
  return `http://localhost:${port}`
}

const server = setupServer(
  rest.get('https://test.mswjs.io/user', async (req, res, ctx) => {
    const actualServerUrl = getServerUrl()
    const originalResponse = await ctx.fetch(`${actualServerUrl}/user`)

    return res(
      ctx.json({
        id: originalResponse.id,
        mocked: true,
      }),
    )
  }),
  rest.get('https://test.mswjs.io/complex-request', async (req, res, ctx) => {
    const actualServerUrl = getServerUrl()
    const bypass = req.url.searchParams.get('bypass')
    const shouldBypass = bypass === 'true'
    const performRequest = shouldBypass
      ? () => ctx.fetch(`${actualServerUrl}/user`, { method: 'POST' })
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
  }),
  rest.post('https://httpbin.org/post', (req, res, ctx) => {
    return res(ctx.json({ id: 303 }))
  }),
)

beforeAll((done) => {
  server.listen()

  // Establish an actual local server.
  const app = express()
  app.get('/user', (req, res) => {
    res.status(200).json({ id: 101 }).end()
  })
  app.post('/user', (req, res) => {
    res.status(200).json({ id: 202 }).end()
  })
  actualServer = app.listen(done)
})

afterEach(() => {
  server.resetHandlers()
})

afterAll((done) => {
  server.close()
  actualServer.close(done)
})

test('returns a combination of mocked and original responses', async () => {
  const res = await fetch('https://test.mswjs.io/user')
  const { status, headers } = res
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers.get('x-powered-by')).toBe('msw')
  expect(body).toEqual({
    id: 101,
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
    id: 202,
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
    id: 303,
    mocked: true,
  })
})
