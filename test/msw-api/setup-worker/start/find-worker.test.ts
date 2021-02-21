import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'

declare namespace window {
  export const msw: {
    registration: ReturnType<SetupWorkerApi['start']>
  }
}

test('resolves the "start" Promise and returns a ServiceWorkerRegistration when using a findWorker that returns true', async () => {
  const { page, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'find-worker.mocks.ts'),
  })

  const resolvedPayload = await page.evaluate(() => {
    return window.msw.registration
  })

  expect(resolvedPayload).toBe('ServiceWorkerRegistration')

  const activationMessageIndex = consoleSpy
    .get('startGroupCollapsed')
    ?.findIndex((text) => {
      return text.includes('[MSW] Mocking enabled')
    })

  const customMessageIndex = consoleSpy.get('log').findIndex((text) => {
    return text.includes('Registration Promise resolved')
  })

  expect(activationMessageIndex).toBeGreaterThan(-1)
  expect(customMessageIndex).toBeGreaterThan(-1)
  expect(customMessageIndex).toBeGreaterThan(activationMessageIndex)
})

test('fails to return a ServiceWorkerRegistration when using a findWorker that returns false', async () => {
  const { page, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'find-worker.error.mocks.ts'),
  })

  const workerStartError = await page.evaluate(() => {
    return window.msw.registration.catch((err) => err)
  })

  const activationMessage = consoleSpy
    .get('startGroupCollapsed')
    ?.findIndex((text) => {
      return text.includes('[MSW] Mocking enabled')
    })

  const errorMessageIndex = consoleSpy.get('error').findIndex((text) => {
    return text.includes('Error - no worker instance after starting')
  })

  expect(workerStartError).toMatch(`\
[MSW] Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "/mockServiceWorker.js".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker\
`)

  expect(activationMessage).toBeUndefined()
  expect(errorMessageIndex).toBeGreaterThan(-1)
})
