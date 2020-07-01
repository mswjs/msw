import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'clearListeners.mock.ts'),
  )
})

afterAll(() => runtime.cleanup())

describe('API: setupWorker / removeListeners', () => {
  it('should remove all listeners when a worker is stopped', async () => {
    const logs = []

    captureConsole(runtime.page, logs, (message) => {
      return message.type() === 'startGroupCollapsed'
    })
    await runtime.page.evaluate(() => {
      return new Promise((resolve, reject) => {
        // @ts-ignore
        const worker1 = window.window.__MSW_CREATE_WORKER__()
        // @ts-ignore
        const worker2 = window.window.__MSW_CREATE_WORKER__()

        worker1.start().then(() => {
          worker1.stop()
          worker2.start().then(resolve, reject)
        }, reject)
      })
    })

    const activationMessages = logs.filter((message) => {
      return message.includes('[MSW] Mocking enabled.')
    })
    expect(activationMessages).toHaveLength(2)

    await runtime.request({
      url: `${runtime.origin}/user`,
    })

    const requetsLogs = logs.filter((message) => {
      return message.includes('[MSW]') && message.includes('GET /user')
    })
    expect(requetsLogs).toHaveLength(1)
  })
})
