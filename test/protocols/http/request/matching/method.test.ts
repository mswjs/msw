import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.post('*/user', () => {
    return HttpResponse.json({ mocked: true })
  }),
]

const test = defineTestNetwork({ handlers })

test('sends a mocked response to a matching method and url', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/method/user'), {
    method: 'POST',
  })
  const status = response.status()
  const body = await response.json()

  expect(status).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    mocked: true,
  })
})

test('sends original response to a non-matching request', async ({
  fetch,
  testServer,
}) => {
  const response = await fetch(testServer.http.url('/method/user'))
  const status = response.status()
  const headers = await response.allHeaders()
  const body = await response.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(body).toEqual({ uses: 'original' })
})
