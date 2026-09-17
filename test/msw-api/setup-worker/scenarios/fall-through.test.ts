import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../setup/vitest-helpers'

const handlers = [
  http.get('*', () => console.log('[get] first')),
  http.get('*/us*', () => console.log('[get] second')),
  http.get('*/user', () => HttpResponse.json({ firstName: 'John' })),
  http.get('*/user', () => console.log('[get] third')),
  http.post('*/blog/*', () => console.log('[post] first')),
  http.post('*/blog/article', () => console.log('[post] second')),
]

const test = defineNetwork({ handlers })

test('falls through all relevant request handlers until response is returned', async ({
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()

  const res = await fetch('/user')
  const body = await res.json()

  // One of the handlers returns a mocked response.
  expect(body).toEqual({ firstName: 'John' })

  // These two handlers execute before the one that returned the response.
  expect(consoleSpy.get('log')).toContain('[get] first')
  expect(consoleSpy.get('log')).toContain('[get] second')

  // The third handler is listed after the one that returns the response,
  // so it must never execute (response is sent).
  expect(consoleSpy.get('log')).not.toContain('[get] third')
})

test('falls through all relevant handler even if none returns response', async ({
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()

  const res = await fetch('/blog/article', {
    method: 'POST',
  })
  const status = res.status()

  // Neither of request handlers returned a mocked response.
  expect(status).toBe(404)
  expect(consoleSpy.get('log')).toContain('[post] first')
  expect(consoleSpy.get('log')).toContain('[post] second')
})
