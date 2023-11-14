import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*', () => console.log('[get] first')),
  http.get('/us*', () => console.log('[get] second')),
  http.get('/user', () => HttpResponse.json({ firstName: 'John' })),
  http.get('/user', () => console.log('[get] third')),

  http.post('/blog/*', () => console.log('[post] first')),
  http.post('/blog/article', () => console.log('[post] second')),
)

worker.start()
