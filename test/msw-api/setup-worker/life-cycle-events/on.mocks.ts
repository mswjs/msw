import { HttpResponse, rest, setupWorker } from 'msw'
import { ServerLifecycleEventsMap } from 'msw/src/node/glossary'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.text('response-body')
  }),
  rest.post('/no-response', () => {
    return
  }),
  rest.get('/unhandled-exception', () => {
    throw new Error('Unhandled resolver error')
  }),
)

worker.events.on('request:start', (request, requestId) => {
  console.warn(`[request:start] ${request.method} ${request.url} ${requestId}`)
})

worker.events.on('request:match', (request, requestId) => {
  console.warn(`[request:match] ${request.method} ${request.url} ${requestId}`)
})

worker.events.on('request:unhandled', (request, requestId) => {
  console.warn(
    `[request:unhandled] ${request.method} ${request.url} ${requestId}`,
  )
})

const requestEndListner: ServerLifecycleEventsMap['request:end'] = (
  request,
  requestId,
) => {
  console.warn(`[request:end] ${request.method} ${request.url} ${requestId}`)
}

worker.events.on('request:end', requestEndListner)

worker.events.on('response:mocked', async (response, request, requestId) => {
  const body = await response.text()
  console.warn(`[response:mocked] ${body} ${requestId}`)
})

worker.events.on('response:bypass', async (response, request, requestId) => {
  const body = await response.text()
  console.warn(`[response:bypass] ${body} ${requestId}`)
})

worker.events.on('unhandledException', (error, request, requestId) => {
  console.warn(
    `[unhandledException] ${request.method} ${request.url} ${requestId} ${error.message}`,
  )
})

worker.start({
  onUnhandledRequest: 'bypass',
})

// @ts-ignore
window.msw = {
  worker,
  requestEndListner,
}
