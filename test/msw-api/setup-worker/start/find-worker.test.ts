import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'
import {
  captureConsole,
  filterLibraryLogs,
} from '../../../support/captureConsole'

test('resolves the "start" Promise and returns a ServiceWorkerRegistration when using a findWorker that returns true', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'find-worker.mocks.ts'),
  )

  const resolvedPayload = await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW_REGISTRATION__
  })

  expect(resolvedPayload).toBe('ServiceWorkerRegistration')

  const { messages } = captureConsole(runtime.page)

  await runtime.reload()

  const activationMessageIndex = messages.startGroupCollapsed.findIndex(
    (text) => {
      return text.includes('[MSW] Mocking enabled')
    },
  )

  const customMessageIndex = messages.log.findIndex((text) => {
    return text.includes('Registration Promise resolved')
  })

  expect(activationMessageIndex).toBeGreaterThan(-1)
  expect(customMessageIndex).toBeGreaterThan(-1)
  expect(customMessageIndex).toBeGreaterThan(activationMessageIndex)

  await runtime.cleanup()
})

test('fails to return a ServiceWorkerRegistration when using a findWorker that returns false', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'find-worker.error.mocks.ts'),
  )

  const resolvedPayload = await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW_REGISTRATION__
  })

  expect(resolvedPayload).toBe(undefined)

  const { messages } = captureConsole(runtime.page)

  await runtime.reload()

  const activationMessageIndex = messages.startGroupCollapsed.findIndex(
    (text) => {
      return text.includes('[MSW] Mocking enabled')
    },
  )

  const errorMessageIndex = messages.error.findIndex((text) => {
    return text.includes('Error - no worker instance after starting')
  })

  const libraryErrors = messages.error.filter(filterLibraryLogs)

  expect(libraryErrors).toContain(`\
[MSW] Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "/mockServiceWorker.js".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker\
`)

  expect(activationMessageIndex).toEqual(-1)
  expect(errorMessageIndex).toBeGreaterThan(-1)
  expect(errorMessageIndex).toBeGreaterThan(activationMessageIndex)

  await runtime.cleanup()
})
