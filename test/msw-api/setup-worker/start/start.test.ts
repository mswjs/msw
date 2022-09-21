import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    startWorker(): ReturnType<SetupWorkerApi['start']>
  }
}

test.beforeEach(async ({ loadExample }) => {
  await loadExample(require.resolve('./start.mocks.ts'), {
    beforeNavigation(compilation) {
      compilation.use((router) => {
        router.get('/worker.js', (_, res) => {
          res.sendFile(path.resolve(__dirname, 'worker.delayed.js'))
        })
      })
    },
  })
})

test('resolves the "start" Promise when the worker has been activated', async ({
  spyOnConsole,
  waitFor,
  page,
}) => {
  const consoleSpy = spyOnConsole()
  const events: Array<string> = []

  const untilWorkerActivated = page
    .evaluate(() => {
      return new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve)
      })
    })
    .then(() => events.push('worker activated'))

  await page.pause()

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
  spyOnConsole,
  page,
  makeUrl,
}) => {
  const consoleSpy = spyOnConsole()

  await page.evaluate(() => {
    return window.msw.startWorker()
  })

  expect(consoleSpy.get('log')).toContain(`Worker scope: ${makeUrl('/')}`)
  expect(consoleSpy.get('log')).toContain(
    `Worker script URL: ${makeUrl('/worker.js')}`,
  )
})

test('prints a warning if "worker.start()" is called multiple times', async ({
  spyOnConsole,
  page,
}) => {
  const consoleSpy = spyOnConsole()

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
