import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com/users/:username', () => {
    return HttpResponse.json({
      mocked: true,
    })
  }),
)

worker.start({
  serviceWorker: {
    // Use custom Service Worker URL for the purpose of intentionally
    // registering an outdated worker. Please do not use this as an example.
    url: '/mockServiceWorker-outdated.js',
    options: {
      scope: '/',
    },
  },
})
