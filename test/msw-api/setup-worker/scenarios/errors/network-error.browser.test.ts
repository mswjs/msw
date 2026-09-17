import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('/user', () => {
    return HttpResponse.error()
  }),
]

const test = defineNetwork({ handlers })

test('propagates a mocked network error', async () => {
  await expect(fetch('/user')).rejects.toThrow('Failed to fetch')
})

test('propagates a CORS violation error from a non-matching request', async ({
  testServer,
}) => {
  await expect(fetch(testServer.http.url('/cors-error'))).rejects.toThrow(
    'Failed to fetch',
  )
})
