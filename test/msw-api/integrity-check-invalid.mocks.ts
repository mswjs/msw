import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('https://api.github.com/users/:username', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
)

// Use custom Service Worker URL for the purpose of intentionally
// registering an outdated worker. Please do not use this as an example.
start('/tmp/mockServiceWorker-outdated.js', {
  scope: '/',
})
