import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('https://example.com/users/:username', ({ params }) => {
    const { username } = params

    return HttpResponse.json({
      name: 'John Maverick',
      originalUsername: username,
    })
  }),
]

const test = defineNetwork({ handlers })

test('mocks response to a GET request', async ({ fetch }) => {
  const response = await fetch('https://example.com/users/octocat')
  const status = response.status()
  const body = await response.json()

  expect(status).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })
})
