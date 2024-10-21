import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    registration: ReturnType<SetupWorkerApi['start']>
  }
}

test('resolves the "start" Promise and returns a ServiceWorkerRegistration when using a findWorker that returns true', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./find-worker.mocks.ts'))

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  const resolvedPayload = await page.evaluate(() => {
    return window.msw.registration
  })

  expect(resolvedPayload).toBe('ServiceWorkerRegistration')

  const activationMessageIndex =
    consoleSpy.get('startGroupCollapsed')?.findIndex((text) => {
      return text.includes('[MSW] Mocking enabled')
    }) ?? -1

  const customMessageIndex =
    consoleSpy.get('log')?.findIndex((text) => {
      return text.includes('Registration Promise resolved')
    }) ?? -1

  expect(activationMessageIndex).toBeGreaterThan(-1)
  expect(customMessageIndex).toBeGreaterThan(-1)
  expect(customMessageIndex).toBeGreaterThan(activationMessageIndex)
})

test('fails to return a ServiceWorkerRegistration when using a findWorker that returns false', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./find-worker.error.mocks.ts'), {
    skipActivation: true,
  })

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  const workerStartError = await page.evaluate(() => {
    return window.msw.registration.catch((error) => error.message)
  })

  const activationMessage = consoleSpy
    .get('startGroupCollapsed')
    ?.findIndex((text) => {
      return text.includes('[MSW] Mocking enabled')
    })

  const errorMessageIndex = consoleSpy.get('error')?.findIndex((text) => {
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
