import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', () => {
    return HttpResponse.html(`
<p class="user" id="abc-123">
  Jane Doe
</p>`)
  }),
]

const test = defineNetwork({ handlers })

test('responds with an HTML response body', async ({ fetch }) => {
  const res = await fetch('/user')
  const status = res.status()
  const headers = await res.allHeaders()
  const text = await res.text()

  expect(status).toBe(200)
  expect(headers['content-type']).toBe('text/html')
  expect(text).toEqual(`
<p class="user" id="abc-123">
  Jane Doe
</p>`)
})
