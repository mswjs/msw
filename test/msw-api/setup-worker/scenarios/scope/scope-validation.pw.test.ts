import { inlineSource, test, expect } from '../../../../setup/playwright'
// @ts-expect-error Importing a JavaScript module.
import { SERVICE_WORKER_BUILD_PATH } from '../../../../../config/constants.js'

const scopeNestedSource = inlineSource(`
import { setupWorker } from 'msw/browser'

const worker = setupWorker()

worker.start({
  serviceWorker: {
    url: './public/mockServiceWorker.js',
  },
})
`)

const scopeRootSource = inlineSource(`
import { setupWorker } from 'msw/browser'

const worker = setupWorker()

worker.start({
  serviceWorker: {
    url: '/mockServiceWorker.js',
  },
})
`)

const scopeNestedQuietSource = inlineSource(`
import { setupWorker } from 'msw/browser'

const worker = setupWorker()

worker.start({
  quiet: true,
  serviceWorker: {
    url: './public/mockServiceWorker.js',
  },
})
`)

test('warns when visiting the page outside of the worker scope', async ({
  loadExample,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  const { compilation } = await loadExample(scopeNestedSource, {
    beforeNavigation(compilation) {
      // Create a proxy to the worker script located under a nested ("/public") path.
      compilation.use((router) => {
        router.get('/public/mockServiceWorker.js', (_, res) => {
          res.sendFile(SERVICE_WORKER_BUILD_PATH)
        })
      })
    },
  })

  // Must display the out-of-scope warning.
  const workerScope = new URL('./public', compilation.previewUrl)

  expect(consoleSpy.get('warning')).toContain(
    `[MSW] Cannot intercept requests on this page because it's outside of the worker's scope ("${workerScope}/"). If you wish to mock API requests on this page, you must resolve this scope issue.

- (Recommended) Register the worker at the root level ("/") of your application.
- Set the "Service-Worker-Allowed" response header to allow out-of-scope workers.`,
  )
  expect(consoleSpy.get('error')).toEqual(undefined)
})

test('does not print the scope warning when the page is within the worker scope', async ({
  loadExample,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(scopeRootSource)

  expect(consoleSpy.get('warning')).toEqual(undefined)
  expect(consoleSpy.get('error')).toEqual(undefined)
})

test('does not print the scope warning when the "quiet" option is enabled', async ({
  loadExample,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(scopeNestedQuietSource, {
    skipActivation: true,
    beforeNavigation(compilation) {
      // Create a proxy to the worker script located under a nested ("/public") path.
      compilation.use((router) => {
        router.get('/public/mockServiceWorker.js', (_, res) => {
          res.sendFile(SERVICE_WORKER_BUILD_PATH)
        })
      })
    },
  })

  // Although the page is out of the worker's scope,
  // the "quiet" option is set to true.
  expect(consoleSpy.get('warning')).toBeUndefined()
})
