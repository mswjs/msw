/**
 * @vitest-environment node
 */
import { HttpServer } from '@open-draft/test-server/http'
import { graphql, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import * as nodeEvents from 'node:events'

const httpServer = new HttpServer((app) => {
  app.post('/graphql', (_, res) => {
    return res.status(500).send('original-response')
  })
})

vi.mock('node:events', async () => {
  const actual = (await vi.importActual('node:events')) as import('node:events')
  return {
    ...actual,
    setMaxListeners: vi.fn(actual.setMaxListeners),
  }
})

let server: ReturnType<typeof setupServer>

const spy = vi.mocked(nodeEvents.setMaxListeners)

beforeAll(async () => {
  await httpServer.listen()

  // Create a large number of request handlers.
  const restHandlers = new Array(100).fill(null).map((_, index) => {
    return http.post(
      httpServer.http.url(`/resource/${index}`),
      async ({ request }) => {
        const text = await request.text()
        return HttpResponse.text(text + index.toString())
      },
    )
  })

  const graphqlHandlers = new Array(100).fill(null).map((_, index) => {
    return graphql.query(`Get${index}`, () => {
      return HttpResponse.json({ data: { index } })
    })
  })

  server = setupServer(...restHandlers, ...graphqlHandlers)
  server.listen({ onUnhandledRequest: 'bypass' })
  vi.spyOn(process.stderr, 'write')
})

afterAll(async () => {
  server.close()
  vi.restoreAllMocks()
  await httpServer.close()
})

it('does not print a memory leak warning when having many request handlers', async () => {
  const httpResponse = await fetch(`${httpServer.http.url(`/resource/42`)}`, {
    method: 'POST',
    body: 'request-body-',
  }).then((response) => response.text())
  expect(spy).toHaveBeenNthCalledWith(1, 200, expect.any(AbortSignal))

  const graphqlResponse = await fetch(httpServer.http.url('/graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query Get42 { index }`,
    }),
  }).then((response) => response.json())

  expect(spy).toHaveBeenNthCalledWith(2, 200, expect.any(AbortSignal))
  // Must not print any memory leak warnings.
  expect(process.stderr.write).not.toHaveBeenCalled()

  // Must return the mocked response.
  expect(httpResponse).toBe('request-body-42')
  expect(graphqlResponse).toEqual({ data: { index: 42 } })

  const unhandledResponse = await fetch(httpServer.http.url('/graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query NotDefinedAtAll { index }`,
    }),
  })

  expect(unhandledResponse.status).toEqual(500)

  expect(spy).toHaveBeenNthCalledWith(3, 200, expect.any(AbortSignal))
  // Must not print any memory leak warnings.
  expect(process.stderr.write).not.toHaveBeenCalled()
})
