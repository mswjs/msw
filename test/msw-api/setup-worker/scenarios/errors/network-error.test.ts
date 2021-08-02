import * as path from 'path'
import { pageWith } from 'page-with'
import { until } from '@open-draft/until'
import { workerConsoleSpy } from '../../../../support/workerConsole'
import { waitFor } from '../../../../support/waitFor'
import { createServer, ServerApi } from '@open-draft/test-server'

let httpServer: ServerApi

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.use((req, res, next) => {
      // Configure CORS to fail all requests issued from the test.
      res.setHeader('Access-Control-Allow-Origin', 'https://mswjs.io')
      next()
    })

    app.get('/resource', (req, res) => {
      res.send('ok').end()
    })
  })
})

afterAll(async () => {
  await httpServer.close()
})

test('propagates a mocked network error', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'network-error.mocks.ts'),
  })

  const endpointUrl = runtime.makeUrl('/user')
  await until(() => runtime.page.evaluate((url) => fetch(url), endpointUrl))

  // Expect the fetch error message.
  expect(runtime.consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Failed to load resource: net::ERR_FAILED'),
    ]),
  )

  // Expect a notification warning from the library.
  await waitFor(() => {
    expect(workerConsoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `[MSW] Successfully emulated a network error for the "GET ${endpointUrl}" request.`,
        ),
      ]),
    )
  })

  // The worker must not produce any errors.
  expect(workerConsoleSpy.get('error')).toBeUndefined()
})

test('propagates an original network error', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'network-error.mocks.ts'),
  })

  const endpointUrl = httpServer.http.makeUrl('/resource')
  await until(() => runtime.page.evaluate((url) => fetch(url), endpointUrl))

  // Expect the default fetch error message.
  await waitFor(() => {
    expect(runtime.consoleSpy.get('error')).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Failed to load resource: net::ERR_FAILED'),
      ]),
    )
  })

  // Expect the explanatory error message from the library.
  await waitFor(() => {
    expect(workerConsoleSpy.get('error')).toEqual([
      `[MSW] Caught an exception from the "GET ${endpointUrl}" request (TypeError: Failed to fetch). This is probably not a problem with Mock Service Worker. There is likely an additional logging output above.`,
    ])
  })
})
