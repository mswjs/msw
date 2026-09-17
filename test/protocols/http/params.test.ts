import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

type RequestParams = {
  username: string
  messageId: string
}

const handlers = [
  http.get<RequestParams>(
    'https://api.github.com/users/:username/messages/:messageId',
    ({ params }) => {
      const { username, messageId } = params

      return HttpResponse.json({
        username,
        messageId,
      })
    },
  ),
]

const test = defineNetwork({ handlers })

test('parses request URL parameters', async ({ fetch }) => {
  const res = await fetch(
    'https://api.github.com/users/octocat/messages/abc-123',
  )
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    username: 'octocat',
    messageId: 'abc-123',
  })
})
