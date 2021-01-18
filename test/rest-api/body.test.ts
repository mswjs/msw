import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'body.mocks.ts'))
}

test('handles a GET request without a body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: runtime.makeUrl('/login'),
  })
  const body = await res.json()
  expect(body).toEqual({ body: undefined })

  return runtime.cleanup()
})

test('handles a GET request without a body and "Content-Type: application/json" header', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: runtime.makeUrl('/login'),
    fetchOptions: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  })
  const body = await res.json()
  expect(body).toEqual({ body: undefined })

  return runtime.cleanup()
})

test('handles a POST request with an explicit empty body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: runtime.makeUrl('/login'),
    fetchOptions: {
      method: 'POST',
      body: '',
    },
  })
  const body = await res.json()
  expect(body).toEqual({ body: '' })

  return runtime.cleanup()
})

test('handles a POST request with a textual body', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: runtime.makeUrl('/login'),
    fetchOptions: {
      method: 'POST',
      body: 'text-body',
    },
  })
  const body = await res.json()
  expect(body).toEqual({ body: 'text-body' })

  return runtime.cleanup()
})

test('handles a POST request with a JSON body and "Content-Type: application/json" header', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: runtime.makeUrl('/login'),
    fetchOptions: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        json: 'body',
      }),
    },
  })
  const body = await res.json()
  expect(body).toEqual({
    body: {
      json: 'body',
    },
  })

  return runtime.cleanup()
})

test('handles a POST request with a multipart body and "Content-Type: multipart/form-data" header', async () => {
  const runtime = await createRuntime()
  // WORKAROUND: `FormData` is not available in `puppeteer.page.evaluate`
  const body = `\
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
  const res = await runtime.request({
    url: `${runtime.origin}/upload`,
    fetchOptions: {
      method: 'POST',
      headers,
      body,
    },
  })
  const jsonRes = await res.json()
  expect(jsonRes).toEqual({
    body: {
      file: 'file content',
      text: 'text content',
      text2: ['another text content', 'another text content 2'],
    },
  })

  return runtime.cleanup()
})
