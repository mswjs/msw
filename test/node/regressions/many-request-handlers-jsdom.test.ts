/**
 * @vitest-environment jsdom
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

const requestCloneSpy = vi.spyOn(Request.prototype, 'clone')

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
  server.listen()
  vi.spyOn(process.stderr, 'write')
})

afterAll(async () => {
  server.close()
  vi.restoreAllMocks()
  await httpServer.close()
})

it('does not print a memory leak warning when having many request handlers', async () => {
  const httpResponse = await fetch(`${httpServer.http.url(`/resource/99`)}`, {
    method: 'POST',
    body: 'request-body-',
  }).then((response) => response.text())
  expect(spy).not.toHaveBeenCalled()
  // Each clone is a new AbortSignal listener which needs to be registered
  expect(requestCloneSpy).toHaveBeenCalledTimes(100)
  expect(process.stderr.write).not.toHaveBeenCalled()
  requestCloneSpy.mockClear()

  const graphqlResponse = await fetch(httpServer.http.url('/graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query Get99 { index }`,
    }),
  }).then((response) => response.json())

  expect(spy).not.toHaveBeenCalled()
  // Each clone is a new AbortSignal listener which needs to be registered
  expect(requestCloneSpy).toHaveBeenCalledTimes(300)
  requestCloneSpy.mockClear()

  // Must not print any memory leak warnings.
  // expect(process.stderr.write).not.toHaveBeenCalled()

  // Must return the mocked response.
  expect(httpResponse).toBe('request-body-99')
  expect(graphqlResponse).toEqual({ data: { index: 99 } })
  // Must not print any memory leak warnings.
  expect(process.stderr.write).not.toHaveBeenCalled()

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

  expect(requestCloneSpy).toHaveBeenCalledTimes(301)
  expect(spy).not.toHaveBeenCalled()
  // Must not print any memory leak warnings.
  expect(process.stderr.write).not.toHaveBeenCalled()
})
