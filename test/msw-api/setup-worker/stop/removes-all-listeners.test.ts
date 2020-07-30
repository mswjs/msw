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

test.skip('removes all listeners when the worker is stopped', async () => {
  const { messages } = captureConsole(runtime.page)

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
  const activationMessages = messages.startGroupCollapsed.filter((text) => {
    return text.includes('[MSW] Mocking enabled.')
  })
  expect(activationMessages).toHaveLength(2)

  await runtime.request({
    url: `${runtime.origin}/user`,
  })

  const requestLogs = messages.startGroupCollapsed.filter((text) => {
    return text.includes('[MSW]') && text.includes('GET /user')
  })

  expect(requestLogs).toHaveLength(1)
})
