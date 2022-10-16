/**
 * @jest-environment jsdom
 */
import * as path from 'path'
import { pageWith } from 'page-with'

test('responds with a FormData response body', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'body-form-data.mocks.ts'),
  })

  const res = await runtime.request('/form-data')
  const headers = await res.allHeaders()
  const responseText = await res.text()

  expect(res.status()).toBe(201)
  expect(headers).toHaveProperty(
    'content-type',
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
