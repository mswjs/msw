// @vitest-environment node
import { http, HttpResponse } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'
import { spyOnLifeCycleEvents } from '../../utils'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()

const httpServer = new HttpServer((app) => {
  app.get('/greeting', (req, res) => {
    res.send('hello')
  })
})

beforeAll(async () => {
  await remote.listen()
  await httpServer.listen()
})

afterAll(async () => {
  await remote.close()
  await httpServer.close()
})

it(
  'emits correct events for the request handled in the test process',
  remote.boundary(async () => {
    remote.use(
      http.get('https://example.com/resource', () => {
        return HttpResponse.json({ mocked: true })
      }),
    )

    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
    )
    const { listener, requestIdPromise } = spyOnLifeCycleEvents(remote)

    const response = await fetch(new URL('/resource', testApp.url))
    const requestId = await requestIdPromise

    // Must respond with the mocked response defined in the test.
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    await expect(response.json()).resolves.toEqual({ mocked: true })

    // Must forward the life-cycle events to the test process.
    await vi.waitFor(() => {
      expect(listener.mock.calls).toEqual([
        [`[request:start] GET https://example.com/resource ${requestId}`],
        [`[request:match] GET https://example.com/resource ${requestId}`],
        [`[request:end] GET https://example.com/resource ${requestId}`],
        [
          `[response:mocked] GET https://example.com/resource ${requestId} 200 {"mocked":true}`,
        ],
      ])
    })
  }),
)

it(
  'emits correct events for the request handled in the remote process',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
    )
    const { listener, requestIdPromise } = spyOnLifeCycleEvents(remote)

    const response = await fetch(new URL('/resource', testApp.url))
    const requestId = await requestIdPromise

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    await expect(response.json()).resolves.toEqual([1, 2, 3])

    await vi.waitFor(() => {
      expect(listener.mock.calls).toEqual([
        [`[request:start] GET https://example.com/resource ${requestId}`],
        [`[request:match] GET https://example.com/resource ${requestId}`],
        [`[request:end] GET https://example.com/resource ${requestId}`],
        [
          `[response:mocked] GET https://example.com/resource ${requestId} 200 [1,2,3]`,
        ],
      ])
    })
  }),
)

it(
  'emits correct events for the request unhandled by either parties',
  remote.boundary(async () => {
    await using testApp = await spawnTestApp(
      new URL('./use.app.js', import.meta.url),
    )
    const { listener, requestIdPromise } = spyOnLifeCycleEvents(remote)

    const resourceUrl = httpServer.http.url('/greeting')
    // Request a special route in the running app that performs a proxy request
    // to the resource specified in the "Location" request header.
    const response = await fetch(new URL('/proxy', testApp.url), {
      headers: {
        location: resourceUrl,
      },
    })
    const requestId = await requestIdPromise

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(await response.text()).toEqual('hello')

    await vi.waitFor(() => {
      expect(listener.mock.calls).toEqual([
        [`[request:start] GET ${resourceUrl} ${requestId}`],
        [`[request:unhandled] GET ${resourceUrl} ${requestId}`],
        [`[request:end] GET ${resourceUrl} ${requestId}`],
        [`[response:bypass] GET ${resourceUrl} ${requestId} 200 hello`],
      ])
    })
  }),
)
