import { HttpResponse, http, LifeCycleEventsMap } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*/user', () => {
    return HttpResponse.text('response-body')
  }),
  http.post('*/no-response', () => {
    return
  }),
  http.get('*/unhandled-exception', () => {
    throw new Error('Unhandled resolver error')
  }),
)

worker.events.on('request:start', ({ request, requestId }) => {
  console.warn(`[request:start] ${request.method} ${request.url} ${requestId}`)
})

worker.events.on('request:match', ({ request, requestId }) => {
  console.warn(`[request:match] ${request.method} ${request.url} ${requestId}`)
})

worker.events.on('request:unhandled', ({ request, requestId }) => {
  console.warn(
    `[request:unhandled] ${request.method} ${request.url} ${requestId}`,
  )
})

const requestEndListener: (
  ...args: LifeCycleEventsMap['request:end']
) => void = ({ request, requestId }) => {
  console.warn(`[request:end] ${request.method} ${request.url} ${requestId}`)
}

worker.events.on('request:end', requestEndListener)

worker.events.on('response:mocked', async ({ response, requestId }) => {
  const body = await response.clone().text()
  console.warn(`[response:mocked] ${body} ${requestId}`)
})

worker.events.on('response:bypass', async ({ response, requestId }) => {
  const body = await response.clone().text()
  console.warn(`[response:bypass] ${body} ${requestId}`)
})

worker.events.on('unhandledException', ({ error, request, requestId }) => {
  console.warn(
    `[unhandledException] ${request.method} ${request.url} ${requestId} ${error.message}`,
  )
})

worker.start({
  onUnhandledRequest: 'bypass',
})

Object.assign(window, {
  msw: {
    worker,
    requestEndListener,
  },
})
