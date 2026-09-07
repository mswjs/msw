import type { SetupWorkerApi } from 'msw/browser'
import { inlineModule, test, expect } from '../../../setup/playwright'

declare namespace window {
  export const msw: {
    registration: ReturnType<SetupWorkerApi['start']>
  }
}

const matchingWorkerExample = inlineModule(({ http, setupWorker }) => {
  const worker = setupWorker(http.get('/user', () => new Response()))
  Object.assign(window, {
    msw: {
      registration: worker
        .start({
          findWorker(scriptUrl, mockServiceWorkerUrl) {
            return scriptUrl === mockServiceWorkerUrl
          },
        })
        .then((registration) => {
          console.log('Registration Promise resolved', registration)
          return registration?.constructor.name
        }),
    },
  })
})

const nonMatchingWorkerExample = inlineModule(({ http, setupWorker }) => {
  const worker = setupWorker(http.get('/user', () => new Response()))
  Object.assign(window, {
    msw: {
      registration: worker
        .start({
          findWorker(scriptUrl) {
            return scriptUrl.includes(
              'some-bad-filename-that-does-not-exist.js',
            )
          },
        })
        .then((registration) => {
          console.log('Registration Promise resolved')
          return registration?.constructor.name
        })
        .catch((error) => {
          console.error('Error - no worker instance after starting', error)
          throw error
        }),
    },
  })
})

test('resolves start with a matching custom findWorker predicate', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(matchingWorkerExample)
  const resolvedPayload = await page.evaluate(() => window.msw.registration)

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
  expect(customMessageIndex).toBeGreaterThan(activationMessageIndex)
})

test('rejects start with a non-matching custom findWorker predicate', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(nonMatchingWorkerExample, { skipActivation: true })

  const workerStartError = await page.evaluate(() => {
    return window.msw.registration.catch((error) => error.message)
  })

  expect(workerStartError).toContain(
    '[MSW] Failed to locate the Service Worker registration using a custom "findWorker" predicate.',
  )
  expect(consoleSpy.get('startGroupCollapsed')).toBeUndefined()
  expect(consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Error - no worker instance after starting'),
    ]),
  )
})
