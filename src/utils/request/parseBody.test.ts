/**
 * @jest-environment jsdom
 */
import { parseBody } from './parseBody'

test('parses a body if the "Content-Type:application/json" header is set', () => {
  expect(
    parseBody(
      `{"property":2}`,
      new Headers({ 'Content-Type': 'application/json' }),
    ),
  ).toEqual({
    property: 2,
  })
})

test('parses a body if the "Content-Type*/json" header is set', () => {
  expect(
    parseBody(
      `{"property":2}`,
      new Headers({ 'Content-Type': 'application/hal+json' }),
    ),
  ).toEqual({
    property: 2,
  })
})

test('parses a body if the "Content-Type:application/json; charset=UTF-8" header is set', () => {
  expect(
    parseBody(
      `{"property":2}`,
      new Headers({ 'Content-Type': 'application/json; charset=UTF-8' }),
    ),
  ).toEqual({
    property: 2,
  })
})

test('returns an invalid JSON body as-is even if the "Content-Type:*/json" header is set', () => {
  expect(
    parseBody('text-body', new Headers({ 'Content-Type': 'application/json' })),
  ).toBe('text-body')
})

test('parses a body if the "Content-Type: multipart/form-data" header is set', () => {
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
------WebKitFormBoundaryvZ1cVXWyK0ilQdab--`
  const headers = new Headers({
    'content-type':
      'multipart/form-data; boundary=--WebKitFormBoundaryvZ1cVXWyK0ilQdab',
  })
  const parsed = parseBody(body, headers)

  // Workaround: JSDOM does not have `Blob.text` implementation.
  // see https://github.com/jsdom/jsdom/issues/2555
  expect(parsed).toHaveProperty('file.name', 'file1.txt')

  expect(parsed).toHaveProperty('text', 'text content')
  expect(parsed).toHaveProperty('text2', [
    'another text content',
    'another text content 2',
  ])
})

test('returns an invalid Multipart body as-is even if the "Content-Type: multipart/form-data" header is set', () => {
  const headers = new Headers({
    'content-type':
      'multipart/form-data; boundary=------WebKitFormBoundaryvZ1cVXWyK0ilQdab',
  })
  expect(parseBody('text-body', headers)).toBe('text-body')
})

test('returns a falsy body as-is', () => {
  expect(parseBody('')).toBe('')
  expect(parseBody(undefined)).toBeUndefined()
})

test('parse a single number as valid JSON body', () => {
  expect(parseBody('1')).toBe('1')
})
