import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://example.com/users/:username', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
)

worker.start({
  serviceWorker: {
    // Use custom Service Worker URL for the purpose of intentionally
    // registering an outdated worker. Please do not use this as an example.
    url: './mockServiceWorker-outdated.js',
    options: {
      scope: '/',
    },
  },
})
