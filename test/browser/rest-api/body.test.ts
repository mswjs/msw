import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = require.resolve('./body.mocks.ts')

test('handles a GET request without a body', async ({ loadExample, fetch }) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/resource')
  const body = await res.json()

  expect(body).toEqual({ value: '' })
})

test('handles a GET request without a body and "Content-Type: application/json" header', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/resource', {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const body = await res.json()
  expect(body).toEqual({ body: undefined })
})

test('handles a POST request with an explicit empty body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/resource', {
    method: 'POST',
    body: '',
  })
  const json = await res.json()

  expect(json).toEqual({ value: '' })
})

test('handles a POST request with a textual body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/resource', {
    method: 'POST',
    body: 'text-body',
  })
  const json = await res.json()

  expect(json).toEqual({ value: 'text-body' })
})

test('handles a POST request with a JSON body and "Content-Type: application/json" header', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/resource', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: 'John',
    }),
  })
  const json = await res.json()

  expect(json).toEqual({
    value: {
      firstName: 'John',
    },
  })
})

test('handles a POST request with a multipart body and "Content-Type: multipart/form-data" header', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

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

  const res = await fetch('/upload', {
    method: 'POST',
    headers: {
      'Content-Type':
        'multipart/form-data; boundary=WebKitFormBoundaryvZ1cVXWyK0ilQdab',
    },
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
