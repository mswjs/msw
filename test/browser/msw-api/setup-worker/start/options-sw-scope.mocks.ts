import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start({
  serviceWorker: {
    options: {
      // Service Worker would control the network traffic
      // outgoing only from the "/profile/*" pages.
      scope: '/profile',
    },
  },
})
