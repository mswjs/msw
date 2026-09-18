import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

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

const test = defineTestNetwork({ handlers })

test('supports redirect in a mocked response', async ({
  fetch,
  makeUrl,
  page,
}) => {
  const [response, redirectResponse] = await Promise.all([
    await fetch('/login'),
    await page.waitForResponse(makeUrl('/user')),
  ])
  const headers = await response.allHeaders()

  // Assert the original response returns redirect.
  expect(headers).toHaveProperty('location', '/user')
  expect(response.fromServiceWorker()).toBe(true)
  expect(response.status()).toBe(307)

  const redirectStatus = redirectResponse.status()
  const redirectBody = await redirectResponse.json()

  // Assert redirect gets requested and mocked.
  expect(redirectStatus).toBe(200)
  expect(redirectResponse.fromServiceWorker()).toBe(true)
  expect(redirectBody).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})
