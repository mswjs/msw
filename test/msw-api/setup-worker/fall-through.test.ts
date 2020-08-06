import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(
    path.resolve(__dirname, 'fall-through.mocks.ts'),
  )
})

afterAll(() => {
  return runtime.cleanup()
})

it('falls through all relevant request handlers until response is returned', async () => {
  const { messages } = captureConsole(runtime.page)

  const res = await runtime.request({
    url: `${runtime.origin}/user`,
  })
  const body = await res.json()

  const firstHandlerMessages = messages.log.filter(
    (text) => text === '[test] first caught',
  )
  const secondHandlerMessages = messages.log.filter(
    (text) => text === '[test] second caught',
  )
  const thirdHandlerMessages = messages.log.filter(
    (text) => text === '[test] third caught',
  )

  // One of the handlers returns a mocked response.
  expect(body).toEqual({ firstName: 'John' })

  // These two handlers execute before the one that returned the response.
  expect(firstHandlerMessages).toHaveLength(1)
  expect(secondHandlerMessages).toHaveLength(1)

  // The third handler is listed after the one that returnes the response,
  // so it must never execute (response is sent).
  expect(thirdHandlerMessages).toHaveLength(0)
})
