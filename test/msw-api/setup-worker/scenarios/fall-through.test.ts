import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'fall-through.mocks.ts'),
  })
}

test('falls through all relevant request handlers until response is returned', async () => {
  const { request, consoleSpy } = await createRuntime()

  const res = await request('/user')
  const body = await res.json()

  // One of the handlers returns a mocked response.
  expect(body).toEqual({ firstName: 'John' })

  // These two handlers execute before the one that returned the response.
  expect(consoleSpy.get('log')).toContain('[get] first')
  expect(consoleSpy.get('log')).toContain('[get] second')

  // The third handler is listed after the one that returnes the response,
  // so it must never execute (response is sent).
  expect(consoleSpy.get('log')).not.toContain('[get] third')
})

test('falls through all relevant handler even if none returns response', async () => {
  const { request, consoleSpy } = await createRuntime()

  const res = await request('/blog/article', {
    method: 'POST',
  })
  const status = res.status()

  // Neither of request handlers returned a mocked response.
  expect(status).toBe(404)
  expect(consoleSpy.get('log')).toContain('[post] first')
  expect(consoleSpy.get('log')).toContain('[post] second')
})
