import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'
import { waitFor } from '../../../support/waitFor'

declare namespace window {
  export const msw: {
    startWorker(): ReturnType<SetupWorkerApi['start']>
  }
}

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'start.mocks.ts'),
    routes(app) {
      app.get('/worker.js', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'worker.delayed.js'))
      })
    },
  })
}

test('resolves the "start" Promise when the worker has been activated', async () => {
  const runtime = await prepareRuntime()
  const events: string[] = []

  const untilWorkerActivated = runtime.page
    .evaluate(() => {
      return new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve),
      )
    })
    .then(() => {
      events.push('worker activated')
    })

  const untilStartResolved = runtime.page
    .evaluate(() => {
      return window.msw.startWorker()
    })
    .then(() => {
      events.push('start resolved')
    })

  const untilActivationMessage = waitFor(() => {
    expect(runtime.consoleSpy.get('startGroupCollapsed')).toContain(
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

test('prints the start message when the worker has been registered', async () => {
  const runtime = await prepareRuntime()

  await runtime.page.evaluate(() => {
    return window.msw.startWorker()
  })

  expect(runtime.consoleSpy.get('log')).toContain(
    `Worker scope: ${runtime.makeUrl('/')}`,
  )
  expect(runtime.consoleSpy.get('log')).toContain(
    `Worker script URL: ${runtime.makeUrl('/worker.js')}`,
  )
})

test('prints a warning if "worker.start()" is called multiple times', async () => {
  const runtime = await prepareRuntime()

  await runtime.page.evaluate(() => {
    return Promise.all([window.msw.startWorker(), window.msw.startWorker()])
  })

  // The activation message ise printed only once.
  expect(runtime.consoleSpy.get('startGroupCollapsed')).toEqual([
    '[MSW] Mocking enabled.',
  ])

  // The warning is printed about multiple calls of "worker.start()".
  expect(runtime.consoleSpy.get('warning')).toEqual([
    `[MSW] Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.`,
  ])
})
