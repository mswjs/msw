import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/greeting', async () => {
    const blob = new Blob(['hello world'], {
      type: 'text/plain',
    })

    return new HttpResponse(blob)
  }),
]

const test = defineTestNetwork({ handlers })

test('responds to a request with a Blob', async ({ fetch }) => {
  const response = await fetch('/greeting')

  const headers = await response.allHeaders()
  expect(headers).toHaveProperty('content-type', 'text/plain')
  expect(response.fromServiceWorker()).toBe(true)

  const text = await response.text()
  expect(text).toBe('hello world')
})
