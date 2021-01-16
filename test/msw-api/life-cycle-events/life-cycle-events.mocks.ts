import { rest, setupWorker } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.text('response-body'))
  }),
  rest.post('/no-response', () => {
    return
  }),
)

worker.on('request:start', (req) => {
  console.warn(`[request:start] ${req.method} ${req.url.href} ${req.id}`)
})

worker.on('request:match', (req) => {
  console.warn(`[request:match] ${req.method} ${req.url.href} ${req.id}`)
})

worker.on('request:unhandled', (req) => {
  console.warn(`[request:unhandled] ${req.method} ${req.url.href} ${req.id}`)
})

worker.on('request:end', (req) => {
  console.warn(`[request:end] ${req.method} ${req.url.href} ${req.id}`)
})

worker.on('response:mocked', async (res, reqId) => {
  const body = await res.text()
  console.warn(`[response:mocked] ${body} ${reqId}`)
})

worker.on('response:bypass', (res, reqId) => {
  console.warn(`[response:bypass] ${reqId}`)
})

worker.start()

// @ts-ignore
window.msw = {
  worker,
}
