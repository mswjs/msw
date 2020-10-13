import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(
      ctx.json({
        firstName: 'John',
        age: 32,
      }),
    )
  }),
  rest.get('/foo', (req, res, ctx) => {
    return res(
      ctx.json({
        firstName: 'John',
        age: 32,
      }),
    )
  }),
)

// @ts-ignore
window.__MSW_REGISTRATION__ = worker.start({
  // Disable logging of matched requests into browser's console
  quiet: (req, res) => {
    console.info('anything?', req.url.href, res.status)
    return req.url.href.includes('foo')
  },
})
