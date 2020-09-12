import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(path.resolve(__dirname, 'shared.mocks.ts'))
})

afterAll(() => {
  return runtime.cleanup()
})

test('shares the client registration for all other clients when "shared" option is set to "true"', async () => {
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW_REGISTRATION__
  })

  await runtime.reload()

  const activationMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW] Shared Mocking enabled.')
  })
  expect(activationMessage).toBeTruthy()

  const res = await runtime.request({
    url: `${runtime.origin}/user`,
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

  expect(requetsLog).toMatch(/\[MSW\] \d{2}:\d{2}:\d{2} GET \/user 200/)
})
