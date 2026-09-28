import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('https://example.com/users/:username', ({ params }) => {
    const { username } = params

    return HttpResponse.json({
      name: 'John Maverick',
      originalUsername: username,
    })
  }),
]

const test = defineTestNetwork({ handlers })

test('handles a 204 status response without Response instance exceptions', async ({
  fetch,
  page,
  testServer,
}) => {
  let pageError: Error | undefined

  page.on('pageerror', (error) => {
    pageError = error
  })

  const response = await fetch(testServer.http.url('/empty-posts'))

  // There must be no such exception:
  // Failed to construct 'Response': Response with null body status cannot have body
  expect(pageError).toBeUndefined()
  expect(response.status()).toBe(204)
})
