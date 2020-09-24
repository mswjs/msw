import * as fs from 'fs'
import * as path from 'path'
import { SERVICE_WORKER_SOURCE_PATH } from '../../config/constants'
import { runBrowserWith } from '../support/runBrowserWith'
import { captureConsole } from '../support/captureConsole'
import copyServiceWorker from '../../config/copyServiceWorker'

test('activates the worker without errors given the latest integrity', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'integrity-check-valid.mocks.ts'),
  )
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  expect(messages.error).toHaveLength(0)

  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  return runtime.cleanup()
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

  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'integrity-check-invalid.mocks.ts'),
  )
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  // Produces a meaningful error in the browser's console.
  const integrityError = messages.error.find((text) => {
    return text.includes('[MSW] Detected outdated Service Worker')
  })

  expect(integrityError).toBeTruthy()

  // Should still keep the mocking enabled.
  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })

  fs.unlinkSync(TEMP_SERVICE_WORKER_PATH)
  return runtime.cleanup()
})
