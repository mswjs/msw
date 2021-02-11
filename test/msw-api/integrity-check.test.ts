import * as fs from 'fs'
import * as path from 'path'
import { pageWith } from 'page-with'
import { SERVICE_WORKER_SOURCE_PATH } from '../../config/constants'
import copyServiceWorker from '../../config/copyServiceWorker'

test('activates the worker without errors given the latest integrity', async () => {
  const { page, request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'integrity-check-valid.mocks.ts'),
  })
  await page.reload()

  expect(consoleSpy.get('error')).toBeUndefined()

  const res = await request('https://api.github.com/users/octocat')
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })
})

test('errors when activating the worker with an outdated integrity', async () => {
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

  const { page, request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'integrity-check-invalid.mocks.ts'),
    routes(app) {
      app.get('/mockServiceWorker-outdated.js', (req, res) => {
        return res
          .set('content-type', 'application/javascript')
          .send(fs.readFileSync(TEMP_SERVICE_WORKER_PATH, 'utf8'))
      })
    },
  })
  await page.reload()

  // Produces a meaningful error in the browser's console.
  const integrityError = consoleSpy.get('error').find((text) => {
    return text.includes('[MSW] Detected outdated Service Worker')
  })

  expect(integrityError).toBeTruthy()

  // Should still keep the mocking enabled.
  const res = await request('https://api.github.com/users/octocat')
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  fs.unlinkSync(TEMP_SERVICE_WORKER_PATH)
})
