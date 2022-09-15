import * as fs from 'fs'
import * as path from 'path'
import { test, expect } from '../playwright.extend'
import { SERVICE_WORKER_SOURCE_PATH } from '../../config/constants'
import copyServiceWorker from '../../config/copyServiceWorker'

test.afterEach(({ previewServer }) => {
  previewServer.resetMiddleware()
})

test('activates the worker without errors given the latest integrity', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./integrity-check-valid.mocks.ts'))

  expect(consoleSpy.get('error')).toBeUndefined()

  const res = await fetch('https://api.github.com/users/octocat')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })
})

test('errors when activating the worker with an outdated integrity', async ({
  loadExample,
  spyOnConsole,
  fetch,
  previewServer,
}) => {
  const TEMP_SERVICE_WORKER_PATH = path.resolve(
    __dirname,
    '../..',
    'tmp/mockServiceWorker-outdated.js',
  )

  // Manually create a Service Worker file with invalid integrity
  await copyServiceWorker(
    SERVICE_WORKER_SOURCE_PATH,
    TEMP_SERVICE_WORKER_PATH,
    'intentionally-invalid-checksum',
  )

  previewServer.apply((app) => {
    app.get('/mockServiceWorker-outdated.js', (_, res) => {
      return res
        .set('content-type', 'application/javascript')
        .send(fs.readFileSync(TEMP_SERVICE_WORKER_PATH, 'utf8'))
    })
  })

  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./integrity-check-invalid.mocks.ts'))

  // Produces a meaningful error in the browser's console.
  expect(consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining('[MSW] Detected outdated Service Worker'),
    ]),
  )

  // Should still keep the mocking enabled.
  const res = await fetch('https://api.github.com/users/octocat')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  fs.unlinkSync(TEMP_SERVICE_WORKER_PATH)
})
