import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/posts', () => {
    // Setting response status code without status text
    // implicitly sets the correct status text.
    return HttpResponse.text(null, { status: 403 })
  }),
  http.get('*/user', () => {
    // Response status text can be overridden
    // to an arbitrary string value.
    return HttpResponse.text(null, {
      status: 401,
      statusText: 'Custom text',
    })
  }),
]

const test = defineTestNetwork({ handlers })

test('sets given status code on the mocked response', async ({ fetch }) => {
  const res = await fetch('/posts')
  const status = res.status()
  const statusText = res.statusText()

  expect(status).toBe(403)
  expect(statusText).toBe('Forbidden')
})

test('supports custom status text on the mocked response', async ({
  fetch,
}) => {
  const res = await fetch('/user')
  const status = res.status()
  const statusText = res.statusText()

  expect(status).toBe(401)
  expect(statusText).toBe('Custom text')
})
