import * as path from 'path'
import { SetupWorkerApi } from 'msw/browser'
import { TestFixtures, test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    startWorker(): ReturnType<SetupWorkerApi['start']>
  }
}

const exampleOptions: Parameters<TestFixtures['loadExample']> = [
  require.resolve('./start.mocks.ts'),
  {
    skipActivation: true,
    beforeNavigation(compilation) {
      compilation.use((router) => {
        router.get('/worker.js', (_, res) => {
          res.sendFile(path.resolve(__dirname, 'worker.delayed.js'))
        })
      })
    },
  },
]

test('resolves the "start" Promise when the worker has been activated', async ({
  loadExample,
  spyOnConsole,
  waitFor,
  page,
}) => {
  await loadExample(...exampleOptions)
  const consoleSpy = spyOnConsole()
  const events: Array<string> = []

  const untilWorkerActivated = page
    .evaluate(() => {
      return new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve)
      })
    })
    .then(() => events.push('worker activated'))

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  const untilStartResolved = page
    .evaluate(() => window.msw.startWorker())
    .then(() => events.push('start resolved'))

  const untilActivationMessage = waitFor(() => {
    expect(consoleSpy.get('startGroupCollapsed')).toContain(
      '[MSW] Mocking enabled.',
    )
    events.push('enabled message')
  })

  await Promise.all([
    untilActivationMessage,
    untilWorkerActivated,
    untilStartResolved,
  ])

  expect(events[0]).toEqual('worker activated')
  expect(events[1]).toEqual('start resolved')
  expect(events[2]).toEqual('enabled message')
  expect(events).toHaveLength(3)
})

test('prints the start message when the worker has been registered', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  const { compilation } = await loadExample(...exampleOptions)
  const consoleSpy = spyOnConsole()

  const expectedWorkerScope = new URL('.', compilation.previewUrl).href
  const expectedWorkerUrl = new URL('./worker.js', compilation.previewUrl).href

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(() => {
    return window.msw.startWorker()
  })

  await page.pause()

  expect(consoleSpy.get('log')).toContain(
    `Worker scope: ${expectedWorkerScope}`,
  )
  expect(consoleSpy.get('log')).toContain(
    `Worker script URL: ${expectedWorkerUrl}`,
  )
})

test('prints a warning if "worker.start()" is called multiple times', async ({
  loadExample,
  spyOnConsole,
  page,
}) => {
  await loadExample(...exampleOptions)
  const consoleSpy = spyOnConsole()

  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await page.evaluate(() => {
    return Promise.all([window.msw.startWorker(), window.msw.startWorker()])
  })

  // The activation message ise printed only once.
  expect(consoleSpy.get('startGroupCollapsed')).toEqual([
    '[MSW] Mocking enabled.',
  ])

  // The warning is printed about multiple calls of "worker.start()".
  expect(consoleSpy.get('warning')).toEqual([
    `[MSW] Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.`,
  ])
})
