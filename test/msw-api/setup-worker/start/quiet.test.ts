import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

declare namespace window {
  export const msw: {
    registration: ReturnType<SetupWorkerApi['start']>
  }
}

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(path.resolve(__dirname, 'quiet.mocks.ts'))
})

afterAll(() => {
  return runtime.cleanup()
})

test('does not log the captured request when the "quiet" option is set to "true"', async () => {
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    return window.msw.registration
  })

  await runtime.reload()

  const activationMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW] Mocking enabled.')
  })
  expect(activationMessage).toBeFalsy()

  const res = await runtime.request({
    url: runtime.makeUrl('/user'),
  })

  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    firstName: 'John',
    age: 32,
  })

  const requetsLog = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW]') && text.includes('GET /user')
  })

  expect(requetsLog).toBeUndefined()
})
