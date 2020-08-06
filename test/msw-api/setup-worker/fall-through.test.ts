import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'
import { captureConsole } from '../../support/captureConsole'

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
    (text) => text === '[test] first caught',
  )
  const secondHandlerMessage = messages.log.find(
    (text) => text === '[test] second caught',
  )
  const thirdHandlerMessage = messages.log.find(
    (text) => text === '[test] third caught',
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
