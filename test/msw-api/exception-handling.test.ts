import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'
import { captureConsole } from '../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'exception-handling.mocks.ts'),
  )
})

afterAll(() => {
  return runtime.cleanup()
})

it('should activate without errors', async () => {
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  expect(messages.error).toHaveLength(0)
})

it('should transform exception into 500 response', async () => {
  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toEqual(500)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).toHaveProperty('errorType', 'ReferenceError')
  expect(body).toHaveProperty('message', 'nonExisting is not defined')
})
