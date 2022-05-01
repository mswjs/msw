import { rest, setupWorker } from 'msw'
import { ServerLifecycleEventsMap } from 'msw/src/node/glossary'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.text('response-body'))
  }),
  rest.post('/no-response', () => {
    return
  }),
  rest.get('/unhandled-exception', () => {
    throw new Error('Unhandled resolver error')
  }),
)

worker.events.on('request:start', (req) => {
  console.warn(`[request:start] ${req.method} ${req.url.href} ${req.id}`)
})

worker.events.on('request:match', (req) => {
  console.warn(`[request:match] ${req.method} ${req.url.href} ${req.id}`)
})

worker.events.on('request:unhandled', (req) => {
  console.warn(`[request:unhandled] ${req.method} ${req.url.href} ${req.id}`)
})

const requestEndListner: ServerLifecycleEventsMap['request:end'] = (req) => {
  console.warn(`[request:end] ${req.method} ${req.url.href} ${req.id}`)
}
worker.events.on('request:end', requestEndListner)

worker.events.on('response:mocked', async (res, requestId) => {
  const body = await res.text()
  console.warn(`[response:mocked] ${body} ${requestId}`)
})

worker.events.on('response:bypass', async (res, requestId) => {
  const body = await res.text()
  console.warn(`[response:bypass] ${body} ${requestId}`)
})

worker.events.on('unhandledException', (error, req) => {
  console.warn(
    `[unhandledException] ${req.method} ${req.url.href} ${req.id} ${error.message}`,
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
