/**
 * @jest-environment jsdom
 */
import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'body.mocks.ts'),
  })
}

test('handles a GET request without a body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/login')
  const body = await res.json()
  expect(body).toEqual({})
})

test('handles a GET request without a body and "Content-Type: application/json" header', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/login', {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const body = await res.json()
  expect(body).toEqual({ body: undefined })
})

test('handles a POST request with an explicit empty body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/login', {
    method: 'POST',
    body: '',
  })
  const body = await res.json()
  expect(body).toEqual({ body: '' })
})

test('handles a POST request with a textual body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/login', {
    method: 'POST',
    body: 'text-body',
  })
  const body = await res.json()
  expect(body).toEqual({ body: 'text-body' })
})

test('handles a POST request with a JSON body and "Content-Type: application/json" header', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: 'body',
    }),
  })
  const body = await res.json()
  expect(body).toEqual({
    body: {
      json: 'body',
    },
  })
})

test('handles a POST request with a multipart body and "Content-Type: multipart/form-data" header', async () => {
  const runtime = await createRuntime()
  // WORKAROUND: `FormData` is not available in `page.evaluate`
  const multipartData = `\
------WebKitFormBoundaryvZ1cVXWyK0ilQdab\r
Content-Disposition: form-data; name="file"; filename="file1.txt"\r
Content-Type: application/octet-stream\r
\r
file content\r
------WebKitFormBoundaryvZ1cVXWyK0ilQdab\r
Content-Disposition: form-data; name="text"\r
\r
text content\r
------WebKitFormBoundaryvZ1cVXWyK0ilQdab\r
Content-Disposition: form-data; name="text2"\r
\r
another text content\r
------WebKitFormBoundaryvZ1cVXWyK0ilQdab\r
Content-Disposition: form-data; name="text2"\r
\r
another text content 2\r
------WebKitFormBoundaryvZ1cVXWyK0ilQdab--\r\n`
  const headers = new Headers({
    'content-type':
      'multipart/form-data; boundary=WebKitFormBoundaryvZ1cVXWyK0ilQdab',
  })
  const res = await runtime.request('/upload', {
    method: 'POST',
    headers,
    body: multipartData,
  })
  const body = await res.json()
  expect(body).toEqual({
    body: {
      file: 'file content',
      text: 'text content',
      text2: ['another text content', 'another text content 2'],
    },
  })
})
