/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://localhost/xml', () => {
    return HttpResponse.xml(`
<user>
  <id>abc-123</id>
  <firstName>John</firstName>
  <lastName>Maverick</lastName>
</user>`)
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('responds with an XML response body', async () => {
  const res = await fetch('http://localhost/xml')
  const text = await res.text()

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('text/xml')
  expect(text).toEqual(`
<user>
  <id>abc-123</id>
  <firstName>John</firstName>
  <lastName>Maverick</lastName>
</user>`)
})
