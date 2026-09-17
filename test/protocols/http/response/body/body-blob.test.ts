import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/greeting', async () => {
    const blob = new Blob(['hello world'], {
      type: 'text/plain',
    })

    return new HttpResponse(blob)
  }),
]

const test = defineNetwork({ handlers })

test('responds to a request with a Blob', async ({ fetch }) => {
  const res = await fetch('/greeting')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty('content-type', 'text/plain')
  expect(res.fromServiceWorker()).toBe(true)

  const text = await res.text()
  expect(text).toBe('hello world')
})
