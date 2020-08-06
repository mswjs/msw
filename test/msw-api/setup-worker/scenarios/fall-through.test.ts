import * as path from 'path'
import { runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'fall-through.mocks.ts'))
}

test('falls through all relevant request handlers until response is returned', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  const res = await runtime.request({
    url: `${runtime.origin}/user`,
  })
  const body = await res.json()

  const firstHandlerMessage = messages.log.find(
    (text) => text === '[get] first',
  )
  const secondHandlerMessage = messages.log.find(
    (text) => text === '[get] second',
  )
  const thirdHandlerMessage = messages.log.find(
    (text) => text === '[get] third',
  )

  // One of the handlers returns a mocked response.
  expect(body).toEqual({ firstName: 'John' })

  // These two handlers execute before the one that returned the response.
  expect(firstHandlerMessage).toBeTruthy()
  expect(secondHandlerMessage).toBeTruthy()

  // The third handler is listed after the one that returnes the response,
  // so it must never execute (response is sent).
  expect(thirdHandlerMessage).toBeFalsy()

  await runtime.cleanup()
})

test('falls through all relevant handler even if none returns response', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  const res = await runtime.request({
    url: `${runtime.origin}/blog/article`,
    fetchOptions: {
      method: 'POST',
    },
  })
  const status = res.status()

  // Neither of request handlers returned a mocked response.
  expect(status).toBe(404)

  const firstHandlerMessage = messages.log.find(
    (text) => text === '[post] first',
  )
  const secondHandlerMessage = messages.log.find(
    (text) => text === '[post] second',
  )

  expect(firstHandlerMessage).toBeTruthy()
  expect(secondHandlerMessage).toBeTruthy()

  await runtime.cleanup()
})
