import { multipartParse } from './multipartParse'

test('parses a given valid multipart string', async () => {
  const body = `
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
------WebKitFormBoundaryvZ1cVXWyK0ilQdab--
`.trim()
  const headers = new Headers({
    'content-type':
      'multipart/form-data; boundary=------WebKitFormBoundaryvZ1cVXWyK0ilQdab',
  })
  const parsed = multipartParse(body, headers)

  // Workaround: JSDOM does not have `Blob.text` implementation.
  // see https://github.com/jsdom/jsdom/issues/2555
  expect(parsed).toHaveProperty('file.name', 'file1.txt')

  expect(parsed).toHaveProperty('text', 'text content')
  expect(parsed).toHaveProperty('text2', [
    'another text content',
    'another text content 2',
  ])
})

test('returns undefined without an error given an invalid multipart string', () => {
  const headers = new Headers({
    'content-type': 'multipart/form-data; boundary=------dummyBoundary',
  })
  const parse = () => multipartParse(`{"invalid": ["multipart"]}`, headers)
  expect(parse).not.toThrow()
  expect(parse()).toBeUndefined()
})
