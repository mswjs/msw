// @vitest-environment jsdom
import { HttpServer } from '@open-draft/test-server/http'
import { http, HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupServer } from 'msw/node'

const httpServer = new HttpServer((app) => {
  app.post('/graphql', (_, res) => {
    return res.status(500).send('original-response')
  })
  app.post('/resource/not-defined', (_, res) => {
    return res.status(500).send('original-response')
  })
})

// The test server URL is only known once it starts listening,
// so use a wildcard link to match any GraphQL endpoint.
const api = graphql.link('*')
const server = setupServer()

const requestCloneSpy = vi.spyOn(Request.prototype, 'clone')
const processWarningSpy = vi.spyOn(process, 'emitWarning')

const NUMBER_OF_REQUEST_HANDLERS = 100

beforeAll(async () => {
  await httpServer.listen()
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(async () => {
  server.close()
  vi.restoreAllMocks()
  await httpServer.close()
})

describe('http handlers', () => {
  beforeEach(() => {
    server.use(
      ...new Array(NUMBER_OF_REQUEST_HANDLERS).fill(null).map((_, index) => {
        return http.post(
          httpServer.http.url(`/resource/${index}`),
          async ({ request }) => {
            const text = await request.text()
            return HttpResponse.text(text + index.toString())
          },
        )
      }),
    )
  })

  it('does not print a memory leak warning for the last handler', async () => {
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

  it('does not print a memory leak warning for onUnhandledRequest', async () => {
    const httpResponse = await fetch(
      `${httpServer.http.url(`/resource/not-defined`)}`,
      {
        method: 'POST',
        body: 'request-body-',
      },
    )
    // One clone is the handler lookup clone, shared (cached) across all handlers.
    // One clone is `onUnhandledRequest` reading the request body to print.
    // Passthrough performs no clone: the raw request bytes are replayed at the socket level.
    expect(requestCloneSpy).toHaveBeenCalledTimes(2)
    expect(httpResponse.status).toBe(500)
    expect(processWarningSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'MaxListenersExceededWarning' }),
    )
  })
})

describe('graphql handlers', () => {
  beforeEach(() => {
    server.use(
      ...new Array(NUMBER_OF_REQUEST_HANDLERS).fill(null).map((_, index) => {
        return api.query(`Get${index}`, () => {
          return HttpResponse.json({ data: { index } })
        })
      }),
    )
  })

  it('does not print a memory leak warning', async () => {
    const graphqlResponse = await fetch(httpServer.http.url('/graphql'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query Get${NUMBER_OF_REQUEST_HANDLERS - 1} { index }`,
      }),
    }).then((response) => response.json())

    expect(requestCloneSpy).toHaveBeenCalledTimes(2)
    expect(graphqlResponse).toEqual({
      data: { index: NUMBER_OF_REQUEST_HANDLERS - 1 },
    })
    expect(processWarningSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: 'MaxListenersExceededWarning' }),
    )
  })

  it('does not print a memory leak warning for onUnhandledRequest', async () => {
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
})
