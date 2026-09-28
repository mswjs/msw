import { http, HttpResponse } from 'msw'
import { defineTestNetwork, expect } from '../../../../setup/vitest-helpers'

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

const test = defineTestNetwork({ handlers })

test('responds with an XML response body', async ({ fetch }) => {
  const response = await fetch('/user')
  const status = response.status()
  const headers = await response.allHeaders()
  const text = await response.text()

  expect(status).toBe(200)
  expect(headers['content-type']).toBe('text/xml')
  expect(text).toEqual(`
<user>
  <id>abc-123</id>
  <firstName>John</firstName>
  <lastName>Maverick</lastName>
</user>`)
})
