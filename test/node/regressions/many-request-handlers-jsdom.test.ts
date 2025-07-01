// @vitest-environment jsdom
import { HttpServer } from '@open-draft/test-server/http'
import { graphql, http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const httpServer = new HttpServer((app) => {
  app.post('/graphql', (_, res) => {
    return res.status(500).send('original-response')
  })
  app.post('/resource/not-defined', (_, res) => {
    return res.status(500).send('original-response')
  })
})

const server = setupServer()

const requestCloneSpy = vi.spyOn(Request.prototype, 'clone')
const processErrorSpy = vi.spyOn(process.stderr, 'write')

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
    expect(processErrorSpy).not.toHaveBeenCalled()
  })

  it('does not print a memory leak warning for onUnhandledRequest', async () => {
    const httpResponse = await fetch(
      `${httpServer.http.url(`/resource/not-defined`)}`,
      {
        method: 'POST',
        body: 'request-body-',
      },
    )
    // Each clone is a new AbortSignal listener which needs to be registered.
    // One clone is `onUnhandledRequest` reading the request body to print.
    expect(requestCloneSpy).toHaveBeenCalledTimes(3)
    expect(httpResponse.status).toBe(500)
    expect(processErrorSpy).not.toHaveBeenCalled()
  })
})

describe('graphql handlers', () => {
  beforeEach(() => {
    server.use(
      ...new Array(NUMBER_OF_REQUEST_HANDLERS).fill(null).map((_, index) => {
        return graphql.query(`Get${index}`, () => {
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
    expect(processErrorSpy).not.toHaveBeenCalled()
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
    expect(requestCloneSpy).toHaveBeenCalledTimes(4)
    // Must not print any memory leak warnings.
    expect(processErrorSpy).not.toHaveBeenCalled()
  })
})
