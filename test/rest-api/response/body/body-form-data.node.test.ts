/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, rest, FormData, File } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('http://localhost/form-data', () => {
    const data = new FormData()
    data.set('name', 'Alice')
    data.set('age', '32')
    data.set('file', new File(['hello world'], 'file.txt'))

    return HttpResponse.formData(data, { status: 201 })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('responds with a FormData response body', async () => {
  const res = await fetch('http://localhost/form-data')
  const responseText = await res.text()

  expect(res.status).toBe(201)
  expect(res.headers.get('content-type')).toEqual(
    expect.stringMatching('multipart/form-data; boundary=(.+)'),
  )
  expect(responseText).toContain(
    'Content-Disposition: form-data; name="name"\r\n\r\nAlice',
  )
  expect(responseText).toContain(
    'Content-Disposition: form-data; name="age"\r\n\r\n32',
  )
  expect(responseText).toContain(
    'Content-Disposition: form-data; name="file"; filename="file.txt"\r\nContent-Type: application/octet-stream\r\n\r\nhello world',
  )
})
