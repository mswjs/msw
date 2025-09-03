import { test, expect } from '../../../../playwright.extend'

test('warns on an unhandled REST API request with an absolute URL', async ({
  loadExample,
  spyOnConsole,
  fetch,
  createServer,
}) => {
  const server = await createServer((app) => {
    app.get('/resource', (req, res) => res.status(404).end())
  })
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./warn.mocks.ts', import.meta.url))

  const res = await fetch(server.http.url('/resource'))
  const status = res.status()

  expect(status).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET ${server.http.url('/resource')}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`),
    ]),
  )
})

test('warns on an unhandled REST API request with a relative URL', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./warn.mocks.ts', import.meta.url))

  const res = await fetch('/user-details')
  const status = res.status()

  expect(status).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET /user-details

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`),
    ]),
  )
})

test('does not warn on request which handler explicitly returns no mocked response', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./warn.mocks.ts', import.meta.url))

  const res = await fetch('/explicit-return', { method: 'POST' })
  const status = res.status()

  expect(status).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.not.arrayContaining([
      expect.stringContaining(
        '[MSW] Warning: intercepted a request without a matching request handler',
      ),
    ]),
  )
})

test('does not warn on request which handler implicitly returns no mocked response', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./warn.mocks.ts', import.meta.url))

  const res = await fetch('/implicit-return', { method: 'POST' })
  const status = res.status()

  expect(status).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.not.arrayContaining([
      expect.stringContaining(
        '[MSW] Warning: intercepted a request without a matching request handler',
      ),
    ]),
  )
})

test('ignores common static assets when using the "warn" strategy', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./warn.mocks.ts', import.meta.url))

  // This request will error so perform it accordingly.
  await page.evaluate(() => {
    return fetch('http://localhost/styles/main.css').catch(() => null)
  })

  expect(consoleSpy.get('warning')).toBeUndefined()
})
