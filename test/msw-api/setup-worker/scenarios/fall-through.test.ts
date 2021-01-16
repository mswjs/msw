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
    url: runtime.makeUrl('/user'),
  })
  const body = await res.json()

  // One of the handlers returns a mocked response.
  expect(body).toEqual({ firstName: 'John' })

  // These two handlers execute before the one that returned the response.
  expect(messages.log).toContain('[get] first')
  expect(messages.log).toContain('[get] second')

  // The third handler is listed after the one that returnes the response,
  // so it must never execute (response is sent).
  expect(messages.log).not.toContain('[get] third')

  await runtime.cleanup()
})

test('falls through all relevant handler even if none returns response', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  const res = await runtime.request({
    url: runtime.makeUrl('/blog/article'),
    fetchOptions: {
      method: 'POST',
    },
  })
  const status = res.status()

  // Neither of request handlers returned a mocked response.
  expect(status).toBe(404)
  expect(messages.log).toContain('[post] first')
  expect(messages.log).toContain('[post] second')

  await runtime.cleanup()
})
