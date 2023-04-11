import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('*', () => console.log('[get] first')),
  rest.get('/us*', () => console.log('[get] second')),
  rest.get('/user', () => HttpResponse.json({ firstName: 'John' })),
  rest.get('/user', () => console.log('[get] third')),

  rest.post('/blog/*', () => console.log('[post] first')),
  rest.post('/blog/article', () => console.log('[post] second')),
)

worker.start()
