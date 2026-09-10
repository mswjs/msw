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

test('handles a 204 status response without Response instance exceptions', async ({
  fetch,
  page,
  testServer,
}) => {
  let pageError: Error | undefined

  page.on('pageerror', (error) => {
    pageError = error
  })

  const res = await fetch(testServer.http.url('/empty-posts'))

  // There must be no such exception:
  // Failed to construct 'Response': Response with null body status cannot have body
  expect(pageError).toBeUndefined()
  expect(res.status()).toBe(204)
})
