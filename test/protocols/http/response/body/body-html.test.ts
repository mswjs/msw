import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', () => {
    return HttpResponse.html(`
<p class="user" id="abc-123">
  Jane Doe
</p>`)
  }),
]

const test = defineTestNetwork({ handlers })

test('responds with an HTML response body', async ({ fetch }) => {
  const response = await fetch('/user')
  const status = response.status()
  const headers = await response.allHeaders()
  const text = await response.text()

  expect(status).toBe(200)
  expect(headers['content-type']).toBe('text/html')
  expect(text).toEqual(`
<p class="user" id="abc-123">
  Jane Doe
</p>`)
})
