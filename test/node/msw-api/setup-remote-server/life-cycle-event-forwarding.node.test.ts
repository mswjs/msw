// @vitest-environment node
import { http, HttpResponse, SetupApi, LifeCycleEventsMap } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { HttpServer } from '@open-draft/test-server/http'
import { spawnTestApp } from './utils'

const remote = setupRemoteServer()

const httpServer = new HttpServer((app) => {
  app.get('/greeting', (req, res) => {
    res.send('hello')
  })
})

function spyOnLifeCycleEvents(setupApi: SetupApi<LifeCycleEventsMap>) {
  const listener = vi.fn()
  const requestIdPromise = new DeferredPromise<string>()

  setupApi.events
    .on('request:start', ({ request, requestId }) => {
      if (request.headers.has('upgrade')) {
        return
      }

      requestIdPromise.resolve(requestId)
      listener(`[request:start] ${request.method} ${request.url} ${requestId}`)
    })
    .on('request:match', ({ request, requestId }) => {
      listener(`[request:match] ${request.method} ${request.url} ${requestId}`)
    })
    .on('request:unhandled', ({ request, requestId }) => {
      listener(
        `[request:unhandled] ${request.method} ${request.url} ${requestId}`,
      )
    })
    .on('request:end', ({ request, requestId }) => {
      if (request.headers.has('upgrade')) {
        return
      }

      listener(`[request:end] ${request.method} ${request.url} ${requestId}`)
    })

  setupApi.events
    .on('response:mocked', async ({ response, request, requestId }) => {
      listener(
        `[response:mocked] ${request.method} ${request.url} ${requestId} ${
          response.status
        } ${await response.clone().text()}`,
      )
    })
    .on('response:bypass', async ({ response, request, requestId }) => {
      if (request.headers.has('upgrade')) {
        return
      }

      listener(
        `[response:bypass] ${request.method} ${request.url} ${requestId} ${
          response.status
        } ${await response.clone().text()}`,
      )
    })

  return {
    listener,
    waitForRequestId() {
      return requestIdPromise
    },
  }
}

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

    await using testApp = await spawnTestApp(require.resolve('../use.app.js'))
    const { listener, waitForRequestId } = spyOnLifeCycleEvents(remote)

    const response = await fetch(new URL('/resource', testApp.url))
    const requestId = await waitForRequestId()

    // Must respond with the mocked response defined in the test.
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(await response.json()).toEqual({ mocked: true })

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
    await using testApp = await spawnTestApp(require.resolve('../use.app.js'))
    const { listener, waitForRequestId } = spyOnLifeCycleEvents(remote)

    const response = await fetch(new URL('/resource', testApp.url))
    const requestId = await waitForRequestId()

    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
    expect(await response.json()).toEqual([1, 2, 3])

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
    await using testApp = await spawnTestApp(require.resolve('../use.app.js'))
    const { listener, waitForRequestId } = spyOnLifeCycleEvents(remote)

    const resourceUrl = httpServer.http.url('/greeting')
    // Request a special route in the running app that performs a proxy request
    // to the resource specified in the "Location" request header.
    const response = await fetch(new URL('/proxy', testApp.url), {
      headers: {
        Location: resourceUrl,
      },
    })
    const requestId = await waitForRequestId()

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
