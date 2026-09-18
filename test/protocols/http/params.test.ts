import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

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

const test = defineTestNetwork({ handlers })

test('parses request URL parameters', async ({ fetch }) => {
  const response = await fetch(
    'https://api.github.com/users/octocat/messages/abc-123',
  )
  const status = response.status()
  const body = await response.json()

  expect(status).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    username: 'octocat',
    messageId: 'abc-123',
  })
})
