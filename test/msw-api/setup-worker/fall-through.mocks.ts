import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('*', () => console.log('[get] first')),
  rest.get('/us*', () => console.log('[get] second')),
  rest.get('/user', (req, res, ctx) => res(ctx.json({ firstName: 'John' }))),
  rest.get('/user', () => console.log('[get] third')),
)

worker.start()
