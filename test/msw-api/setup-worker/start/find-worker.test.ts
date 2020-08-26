import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

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

  const mswDeveloperWarningMessageIndex = messages.warning.findIndex((text) => {
    return text.includes(
      '[MSW] worker.start() registered the service worker, but was provided a findWorker predicate that failed to find a worker instance. Please verify your configuration.',
    )
  })

  expect(activationMessageIndex).toEqual(-1)
  expect(mswDeveloperWarningMessageIndex).toBeGreaterThan(-1)
  expect(errorMessageIndex).toBeGreaterThan(-1)
  expect(errorMessageIndex).toBeGreaterThan(activationMessageIndex)

  await runtime.cleanup()
})
