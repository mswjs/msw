import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../../../setup/vitest-helpers'

const handlers = [
  http.get('*/user', () => {
    return HttpResponse.xml(`
<user>
  <id>abc-123</id>
  <firstName>John</firstName>
  <lastName>Maverick</lastName>
</user>`)
  }),
]

const test = defineNetwork({ handlers })

test('responds with an XML response body', async ({ fetch }) => {
  const res = await fetch('/user')
  const status = res.status()
  const headers = await res.allHeaders()
  const text = await res.text()

  expect(status).toBe(200)
  expect(headers['content-type']).toBe('text/xml')
  expect(text).toEqual(`
<user>
  <id>abc-123</id>
  <firstName>John</firstName>
  <lastName>Maverick</lastName>
</user>`)
})
