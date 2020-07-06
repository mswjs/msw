import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('*', () => console.log('[test] first caught')),
  rest.get('/us*', () => console.log('[test] second caught')),
  rest.get('/user', (req, res, ctx) => res(ctx.json({ firstName: 'John' }))),
)

worker.start()
