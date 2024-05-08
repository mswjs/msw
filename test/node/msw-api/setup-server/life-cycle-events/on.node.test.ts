/**
 * @vitest-environment node
 */
import { HttpResponse, http } from 'msw'
import { SetupServerApi, setupServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  app.get('/user', (req, res) => res.status(500).end())
  app.post('/no-response', (req, res) => res.send('original-response'))
  app.get('/unknown-route', (req, res) => res.send('majestic-unknown'))
})

const server = setupServer()

function spyOnEvents(server: SetupServerApi) {
  const listener = vi.fn()
  const wrapListener = (eventName: string, listener: any) => {
    return (...args) => listener(eventName, ...args)
  }

  server.events.on('request:start', wrapListener('request:start', listener))
  server.events.on('request:match', wrapListener('request:match', listener))
  server.events.on(
    'request:unhandled',
    wrapListener('request:unhandled', listener),
  )
  server.events.on('request:end', wrapListener('request:end', listener))
  server.events.on('response:mocked', wrapListener('response:mocked', listener))
  server.events.on('response:bypass', wrapListener('response:bypass', listener))
  server.events.on(
    'unhandledException',
    wrapListener('unhandledException', listener),
  )

  return listener
}

beforeAll(async () => {
  // Supress "Expected a mocking resolver function to return a mocked response"
  // warnings when hitting intentionally empty resolver.
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)

  await httpServer.listen()

  server.use(
    http.get(httpServer.http.url('/user'), () => {
      return HttpResponse.text('response-body')
    }),
    http.post(httpServer.http.url('/no-response'), () => {
      return
    }),
    http.get(httpServer.http.url('/unhandled-exception'), () => {
      throw new Error('Unhandled resolver error')
    }),
  )
  server.listen()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('emits events for a handled request and mocked response', async () => {
  const listener = spyOnEvents(server)
  const url = httpServer.http.url('/user')
  await fetch(url)

  expect(listener).toHaveBeenNthCalledWith(
    1,
    'request:start',
    expect.objectContaining({
      request: expect.any(Request),
      requestId: expect.any(String),
    }),
  )

  const { request, requestId } = listener.mock.calls[0][1]
  expect(request.method).toBe('GET')
  expect(request.url).toBe(url)

  expect(listener).toHaveBeenNthCalledWith(
    2,
    'request:match',
    expect.objectContaining({
      request,
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    'request:end',
    expect.objectContaining({
      request,
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    4,
    'response:mocked',
    expect.objectContaining({
      request,
      requestId,
      response: expect.any(Response),
    }),
  )

  const { response } = listener.mock.calls[3][1]
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(await response.text()).toBe('response-body')

  expect(listener).toHaveBeenCalledTimes(4)
})

test('emits events for a handled request with no response', async () => {
  const listener = spyOnEvents(server)
  const url = httpServer.http.url('/no-response')
  await fetch(url, { method: 'POST' })

  expect(listener).toHaveBeenNthCalledWith(
    1,
    'request:start',
    expect.objectContaining({
      request: expect.any(Request),
      requestId: expect.any(String),
    }),
  )

  const { request, requestId } = listener.mock.calls[0][1]
  expect(request.method).toBe('POST')
  expect(request.url).toBe(url)

  expect(listener).toHaveBeenNthCalledWith(
    2,
    'request:end',
    expect.objectContaining({
      request,
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    'response:bypass',
    expect.objectContaining({
      request,
      requestId,
      response: expect.any(Response),
    }),
  )

  const { response } = listener.mock.calls[2][1]
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(await response.text()).toBe('original-response')

  expect(listener).toHaveBeenCalledTimes(3)
})

test('emits events for an unhandled request', async () => {
  const listener = spyOnEvents(server)
  const url = httpServer.http.url('/unknown-route')
  await fetch(url)

  expect(listener).toHaveBeenNthCalledWith(
    1,
    'request:start',
    expect.objectContaining({
      request: expect.any(Request),
      requestId: expect.any(String),
    }),
  )

  const { request, requestId } = listener.mock.calls[0][1]
  expect(request.method).toBe('GET')
  expect(request.url).toBe(url)

  expect(listener).toHaveBeenNthCalledWith(
    2,
    'request:unhandled',
    expect.objectContaining({
      request,
      requestId,
    }),
  )
  expect(listener).toHaveBeenNthCalledWith(
    3,
    'request:end',
    expect.objectContaining({
      request,
      requestId,
    }),
  )

  expect(listener).toHaveBeenNthCalledWith(
    4,
    'response:bypass',
    expect.objectContaining({
      request,
      requestId,
      response: expect.any(Response),
    }),
  )

  const { response } = listener.mock.calls[3][1]
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(await response.text()).toBe('majestic-unknown')

  expect(listener).toHaveBeenCalledTimes(4)
})

test('emits unhandled exceptions in the request handler', async () => {
  const listener = spyOnEvents(server)
  const url = httpServer.http.url('/unhandled-exception')
  await fetch(url).catch(() => undefined)

  expect(listener).toHaveBeenNthCalledWith(
    1,
    'request:start',
    expect.objectContaining({
      request: expect.any(Request),
      requestId: expect.any(String),
    }),
  )

  const { request, requestId } = listener.mock.calls[0][1]
  expect(request.method).toBe('GET')
  expect(request.url).toBe(url)

  expect(listener).toHaveBeenNthCalledWith(
    2,
    'unhandledException',
    expect.objectContaining({
      request,
      requestId,
      error: new Error('Unhandled resolver error'),
    }),
  )

  /**
   * @note The fallback 500 response still counts as a mocked response.
   * I'm torn on this but I believe we should indicate that the request
   * (a) received a response; (b) that response was mocked.
   */
  expect(listener).toHaveBeenNthCalledWith(
    3,
    'response:mocked',
    expect.objectContaining({
      request,
      requestId,
      response: expect.any(Response),
    }),
  )

  const { response } = listener.mock.calls[2][1]
  expect(response.status).toBe(500)
  expect(response.statusText).toBe('Unhandled Exception')

  expect(listener).toHaveBeenCalledTimes(3)
})

test('stops emitting events once the server is stopped', async () => {
  const listener = spyOnEvents(server)
  server.close()

  await fetch(httpServer.http.url('/user'))

  expect(listener).not.toHaveBeenCalled()
})
