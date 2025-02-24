import { test, expect } from '../../../../playwright.extend'

test('warns on an unhandled REST API request with an absolute URL', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./warn.mocks.ts'))

  const res = await fetch('https://mswjs.io/non-existing-page')
  const status = res.status()

  expect(status).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET https://mswjs.io/non-existing-page

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
    ]),
  )
})

test('warns on an unhandled REST API request with a relative URL', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./warn.mocks.ts'))

  const res = await fetch('/user-details')
  const status = res.status()

  expect(status).toBe(404)
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET /user-details

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
    ]),
  )
})

test('does not warn on request which handler explicitly returns no mocked response', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./warn.mocks.ts'))

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
  await loadExample(require.resolve('./warn.mocks.ts'))

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
  await loadExample(require.resolve('./warn.mocks.ts'))

  // This request will error so perform it accordingly.
  await page.evaluate(() => {
    return fetch('https://example.com/styles/main.css').catch(() => null)
  })

  expect(consoleSpy.get('warning')).toBeUndefined()
})
