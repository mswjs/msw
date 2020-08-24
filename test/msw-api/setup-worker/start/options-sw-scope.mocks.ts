import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
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
