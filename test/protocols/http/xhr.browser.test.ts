import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('https://api.github.com/users/octocat', () => {
    return HttpResponse.json({ mocked: true })
  }),
]

const test = defineTestNetwork({ handlers })

test('mocks a response to an XMLHttpRequest', async ({ page }) => {
  const REQUEST_URL = 'https://api.github.com/users/octocat'

  page.evaluate((url) => {
    const req = new XMLHttpRequest()
    req.open('GET', url)
    req.send()
  }, REQUEST_URL)

  const response = await page.waitForResponse(REQUEST_URL)
  const body = await response.json()

  expect(response.status()).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})
