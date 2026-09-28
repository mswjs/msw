// @vitest-environment node
import { createTestHttpServer } from '@epic-web/test-server/http'
import { http, HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupServer } from 'msw/node'

// The test server URL is only known once it starts listening,
// so use a wildcard link to match any GraphQL endpoint.
const api = graphql.link('*')
const server = setupServer()

const requestCloneSpy = vi.spyOn(Request.prototype, 'clone')
const processWarningSpy = vi.spyOn(process, 'emitWarning')

const NUMBER_OF_REQUEST_HANDLERS = 100

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

test('does not print a memory leak warning for the last http handler', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/resource/not-defined', () => {
        return new Response('original-response', { status: 500 })
      })
    },
  })
  server.use(
    ...new Array(NUMBER_OF_REQUEST_HANDLERS).fill(null).map((_, index) => {
      return http.post(
        httpServer.http.url(`/resource/${index}`).href,
        async ({ request }) => {
          const text = await request.text()
          return HttpResponse.text(text + index.toString())
        },
      )
    }),
  )

  const httpResponse = await fetch(
    `${httpServer.http.url(`/resource/${NUMBER_OF_REQUEST_HANDLERS - 1}`)}`,
    {
      method: 'POST',
      body: 'request-body-',
    },
  ).then((response) => response.text())

  // Each clone is a new AbortSignal listener which needs to be registered
  expect(requestCloneSpy).toHaveBeenCalledTimes(1)
  expect(httpResponse).toBe(`request-body-${NUMBER_OF_REQUEST_HANDLERS - 1}`)
  expect(processWarningSpy).not.toHaveBeenCalledWith(
    expect.objectContaining({ name: 'MaxListenersExceededWarning' }),
  )
})

test('does not print a memory leak warning for an unhandled http request', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/resource/not-defined', () => {
        return new Response('original-response', { status: 500 })
      })
    },
  })
  server.use(
    ...new Array(NUMBER_OF_REQUEST_HANDLERS).fill(null).map((_, index) => {
      return http.post(
        httpServer.http.url(`/resource/${index}`).href,
        async ({ request }) => {
          const text = await request.text()
          return HttpResponse.text(text + index.toString())
        },
      )
    }),
  )

  const httpResponse = await fetch(
    `${httpServer.http.url(`/resource/not-defined`)}`,
    {
      method: 'POST',
      body: 'request-body-',
    },
  )
  // One clone is the handler lookup clone, shared (cached) across all handlers.
  // One clone is `onUnhandledFrame` reading the request body to print.
  // Passthrough performs no clone: the raw request bytes are replayed at the socket level.
  expect(requestCloneSpy).toHaveBeenCalledTimes(2)
  expect(httpResponse.status).toBe(500)
  expect(processWarningSpy).not.toHaveBeenCalledWith(
    expect.objectContaining({ name: 'MaxListenersExceededWarning' }),
  )
})

test('does not print a memory leak warning for the last graphql handler', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/graphql', () => {
        return new Response('original-response', { status: 500 })
      })
    },
  })
  server.use(
    ...new Array(NUMBER_OF_REQUEST_HANDLERS).fill(null).map((_, index) => {
      return api.query(`Get${index}`, () => {
        return HttpResponse.json({ data: { index } })
      })
    }),
  )

  const graphqlResponse = await fetch(httpServer.http.url('/graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `query Get${NUMBER_OF_REQUEST_HANDLERS - 1} { index }`,
    }),
  }).then((response) => response.json())

  // Each clone is a new AbortSignal listener which needs to be registered
  expect(requestCloneSpy).toHaveBeenCalledTimes(2)
  expect(graphqlResponse).toEqual({
    data: { index: NUMBER_OF_REQUEST_HANDLERS - 1 },
  })
  expect(processWarningSpy).not.toHaveBeenCalledWith(
    expect.objectContaining({ name: 'MaxListenersExceededWarning' }),
  )
})

test('does not print a memory leak warning for an unhandled graphql query', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/graphql', () => {
        return new Response('original-response', { status: 500 })
      })
    },
  })
  server.use(
    ...new Array(NUMBER_OF_REQUEST_HANDLERS).fill(null).map((_, index) => {
      return api.query(`Get${index}`, () => {
        return HttpResponse.json({ data: { index } })
      })
    }),
  )

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
  // Same clones as the unhandled http request, plus one clone
  // for parsing the GraphQL query from the request body.
  expect(requestCloneSpy).toHaveBeenCalledTimes(3)
  // Must not print any memory leak warnings.
  expect(processWarningSpy).not.toHaveBeenCalledWith(
    expect.objectContaining({ name: 'MaxListenersExceededWarning' }),
  )
})
