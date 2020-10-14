import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'quiet-predicate.true.mocks.ts'),
  )
})

afterAll(() => {
  return runtime.cleanup()
})

test('log the captured request when the "quiet" option is returns to "false"', async () => {
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW_REGISTRATION__
  })

  await runtime.reload()

  const activationMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW] Mocking enabled.')
  })
  expect(activationMessage).toBeFalsy()

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
  expect(requetsLog).toBeTruthy()
})

test('does not log the captured request when the "quiet" option is returns to "true"', async () => {
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.__MSW_REGISTRATION__
  })

  await runtime.reload()

  const activationMessage = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW] Mocking enabled.')
  })
  expect(activationMessage).toBeFalsy()

  const res = await runtime.request({
    url: `${runtime.origin}/profile`,
  })

  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    firstName: 'John',
    age: 32,
  })

  const requetsLog = messages.startGroupCollapsed.find((text) => {
    return text.includes('[MSW]') && text.includes('GET /profile')
  })

  expect(requetsLog).toBeUndefined()
})
