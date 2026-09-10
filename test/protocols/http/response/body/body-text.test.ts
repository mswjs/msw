import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/text', () => {
    return HttpResponse.text('hello world')
  }),
]

const test = defineNetwork({ handlers })

test('responds with a text response body', async ({ fetch }) => {
  const res = await fetch('/text')
  const headers = await res.allHeaders()
  const text = await res.text()

  expect(headers).toHaveProperty('content-type', 'text/plain')
  expect(text).toBe('hello world')
})
