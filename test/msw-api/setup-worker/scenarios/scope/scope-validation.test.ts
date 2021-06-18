/**
 * @jest-environment node
 */
import * as path from 'path'
import { pageWith } from 'page-with'
import { SERVICE_WORKER_BUILD_PATH } from '../../../../../config/constants'

it('warns when visiting to the page outside of the worker scope', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'scope-nested.mocks.ts'),
    routes(app) {
      // Create a proxy to the worker script located under a nested ("/public") path.
      app.get('/public/mockServiceWorker.js', (req, res) => {
        res.sendFile(SERVICE_WORKER_BUILD_PATH)
      })
    },
  })

  // Should display the out-of-scope warning.
  const workerScope = runtime.makeUrl('/public/')

  expect(runtime.consoleSpy.get('warning')).toContain(
    `[MSW] Cannot intercept requests on this page because it's outside of the worker's scope ("${workerScope}"). If you wish to mock API requests on this page, you must resolve this scope issue.

- (Recommended) Register the worker at the root level ("/") of your application.
- Set the "Service-Worker-Allowed" response header to allow out-of-scope workers.`,
  )
  expect(runtime.consoleSpy.get('error')).toEqual(undefined)
})

it('does not print the scope warning when the page is within the worker scope', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'scope-root.mocks.ts'),
  })

  expect(runtime.consoleSpy.get('warning')).toEqual(undefined)
  expect(runtime.consoleSpy.get('error')).toEqual(undefined)
})

it('does not print the scope warning when the "quiet" option is enabled', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'scope-nested-quiet.mocks.ts'),
    routes(app) {
      app.get('/public/mockServiceWorker.js', (req, res) => {
        res.sendFile(SERVICE_WORKER_BUILD_PATH)
      })
    },
  })

  // Although the page is out of the worker's scope,
  // the "quiet" option is set to true.
  expect(runtime.consoleSpy.get('warning')).toEqual(undefined)
})
