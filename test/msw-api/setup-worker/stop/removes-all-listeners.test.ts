import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'removes-all-listeners.mocks.ts'),
  )
})

afterAll(() => runtime.cleanup())

test('removes all listeners when the worker is stopped', async () => {
  const logs = []

  captureConsole(runtime.page, logs, (message) => {
    return message.type() === 'startGroupCollapsed'
  })

  await runtime.page.evaluate(() => {
    // @ts-ignore
    const worker1 = window.window.__MSW_CREATE_WORKER__()
    // @ts-ignore
    const worker2 = window.window.__MSW_CREATE_WORKER__()

    return worker1.start().then(() => {
      worker1.stop()
      return worker2.start()
    })
  })

  const activationMessages = logs.filter((message) => {
    return message.includes('[MSW] Mocking enabled.')
  })
  expect(activationMessages).toHaveLength(2)

  await runtime.request({
    url: `${runtime.origin}/user`,
  })

  const requestLogs = logs.filter((message) => {
    return message.includes('[MSW]') && message.includes('GET /user')
  })

  expect(requestLogs).toHaveLength(1)
})
