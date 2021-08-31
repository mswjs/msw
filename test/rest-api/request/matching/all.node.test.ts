/**
 * @jest-environment node
 */
import fetch, { Response } from 'node-fetch'
import { createServer, ServerApi } from '@open-draft/test-server'
import { RESTMethods, rest } from 'msw'
import { setupServer } from 'msw/node'

let httpServer: ServerApi

const server = setupServer()

beforeAll(async () => {
  httpServer = await createServer((app) => {
    // Responding with "204 No Content" because the "OPTIONS"
    // request returns 204 without an obvious way to override that.
    app.all('*', (req, res) => res.status(204).end())
  })
  server.listen({
    onUnhandledRequest: 'bypass',
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

async function forEachMethod(callback: (method: RESTMethods) => unknown) {
  for (const method of Object.values(RESTMethods)) {
    await callback(method)
  }
}

test('matches all requests given no custom path', async () => {
  server.use(
    rest.all('*', (req, res, ctx) => {
      return res(ctx.text('welcome to the jungle'))
    }),
  )

  const responses = await Promise.all(
    Object.values(RESTMethods).reduce<Promise<Response>[]>((all, method) => {
      return all.concat(
        [
          httpServer.http.makeUrl('/'),
          httpServer.http.makeUrl('/foo'),
          'https://example.com',
        ].map((url) => fetch(url, { method })),
      )
    }, []),
  )

  for (const response of responses) {
    expect(response.status).toEqual(200)
    expect(await response.text()).toEqual('welcome to the jungle')
  }
})

test('respects custom path when matching requests', async () => {
  server.use(
    rest.all(httpServer.http.makeUrl('/api/*'), (req, res, ctx) => {
      return res(ctx.text('hello world'))
    }),
  )

  // Root requests.
  await forEachMethod(async (method) => {
    const response = await fetch(httpServer.http.makeUrl('/api/'), { method })
    expect(response.status).toEqual(200)
    expect(await response.text()).toEqual('hello world')
  })

  // Nested requests.
  await forEachMethod(async (method) => {
    const response = await fetch(httpServer.http.makeUrl('/api/foo'), {
      method,
    })
    expect(response.status).toEqual(200)
    expect(await response.text()).toEqual('hello world')
  })

  // Mismatched requests.
  await forEachMethod(async (method) => {
    const response = await fetch(httpServer.http.makeUrl('/foo'), { method })
    expect(response.status).toEqual(204)
  })
})
