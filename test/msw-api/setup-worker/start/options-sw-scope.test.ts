import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'options-sw-scope.mocks.ts'),
  )
})

afterAll(() => {
  return runtime.cleanup()
})

test('respects a custom "scope" Service Worker option', async () => {
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  const activationMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW] Mocking enabled.')
  })
  expect(activationMessage).toBeTruthy()

  const res = await runtime.request({
    url: runtime.makeUrl('/user'),
  })
  const status = res.status()

  // Since the root "/" page lies outside of the custom worker scope,
  // it won't be able to intercept an otherwise matching request.
  expect(status).toBe(404)
})
