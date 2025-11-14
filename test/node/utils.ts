import { DeferredPromise } from '@open-draft/deferred-promise'
import { vi, afterEach } from 'vitest'
import { LifeCycleEventsMap, SetupApi } from 'msw'

export function spyOnLifeCycleEvents(api: SetupApi<LifeCycleEventsMap>) {
  const listener = vi.fn()
  const requestIdPromise = new DeferredPromise<string>()

  afterEach(() => listener.mockReset())

  api.events
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
    requestIdPromise,
  }
}
