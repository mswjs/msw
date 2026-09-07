import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/login', () => {
    return HttpResponse.text(null, {
      status: 307,
      headers: {
        Location: '/user',
      },
    })
  }),
  http.get('*/user', () => {
    return HttpResponse.json({
      firstName: 'John',
      lastName: 'Maverick',
    })
  }),
]

const test = defineNetwork({ handlers })

test('supports redirect in a mocked response', async ({
  fetch,
  makeUrl,
  page,
}) => {
  const [res, redirectRes] = await Promise.all([
    await fetch('/login'),
    await page.waitForResponse(makeUrl('/user')),
  ])
  const headers = await res.allHeaders()

  // Assert the original response returns redirect.
  expect(headers).toHaveProperty('location', '/user')
  expect(res.fromServiceWorker()).toBe(true)
  expect(res.status()).toBe(307)

  const redirectStatus = redirectRes.status()
  const redirectBody = await redirectRes.json()

  // Assert redirect gets requested and mocked.
  expect(redirectStatus).toBe(200)
  expect(redirectRes.fromServiceWorker()).toBe(true)
  expect(redirectBody).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})
