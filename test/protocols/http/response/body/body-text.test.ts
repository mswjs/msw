import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/text', () => {
    return HttpResponse.text('hello world')
  }),
]

const test = defineTestNetwork({ handlers })

test('responds with a text response body', async ({ fetch }) => {
  const response = await fetch('/text')
  const headers = await response.allHeaders()
  const text = await response.text()

  expect(headers).toHaveProperty('content-type', 'text/plain')
  expect(text).toBe('hello world')
})
