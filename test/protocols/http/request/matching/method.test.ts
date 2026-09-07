import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.post('*/user', () => {
    return HttpResponse.json({ mocked: true })
  }),
]

const test = defineNetwork({ handlers })

test('sends a mocked response to a matching method and url', async ({
  fetch,
  testServer,
}) => {
  const res = await fetch(testServer.http.url('/method/user'), {
    method: 'POST',
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    mocked: true,
  })
})

test('sends original response to a non-matching request', async ({
  fetch,
  testServer,
}) => {
  const res = await fetch(testServer.http.url('/method/user'))
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'Express')
  expect(body).toEqual({ uses: 'original' })
})
