import { until } from '@open-draft/until'
import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../../../../playwright.extend'

let server: HttpServer

test.beforeEach(async ({ createServer }) => {
  server = await createServer((app) => {
    app.use((_, res, next) => {
      // Configure CORS to fail all requests issued from the test.
      res.setHeader('Access-Control-Allow-Origin', 'https://mswjs.io')
      next()
    })

    app.get('/resource', (req, res) => {
      res.send('ok').end()
    })
  })
})

test('propagates a mocked network error', async ({
  loadExample,
  spyOnConsole,
  workerConsole,
  fetch,
  page,
  waitFor,
  makeUrl,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./network-error.mocks.ts'))

  const endpointUrl = makeUrl('/user')
  await until(() => page.evaluate((url) => fetch(url), endpointUrl))

  // Expect the fetch error message.
  expect(consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Failed to load resource: net::ERR_FAILED'),
    ]),
  )

  // Expect a notification warning from the library.
  await waitFor(() => {
    expect(workerConsole.consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `[MSW] Successfully emulated a network error for the "GET ${endpointUrl}" request.`,
        ),
      ]),
    )
  })

  // The worker must not produce any errors.
  expect(workerConsole.consoleSpy.get('error')).toBeUndefined()
})

test('propagates a CORS violation error from a non-matching request', async ({
  loadExample,
  spyOnConsole,
  workerConsole,
  page,
  waitFor,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./network-error.mocks.ts'))

  const endpointUrl = server.http.url('/resource')
  await until(() => page.evaluate((url) => fetch(url), endpointUrl))

  // Expect the default fetch error message.
  await waitFor(() => {
    expect(consoleSpy.get('error')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Failed to load resource: net::ERR_FAILED'),
      ]),
    )
  })

  // Expect the explanatory error message from the library.
  await waitFor(() => {
    expect(workerConsole.consoleSpy.get('error')).toEqual([
      `[MSW] Caught an exception from the "GET ${endpointUrl}" request (TypeError: Failed to fetch). This is probably not a problem with Mock Service Worker. There is likely an additional logging output above.`,
    ])
  })
})
