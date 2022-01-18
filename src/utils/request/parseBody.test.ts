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

test('parses a body for headers with letter cases', () => {
  expect(
    parseBody(
      `{"property":2}`,
      new Headers({ 'Content-Type': 'Application/JSON' }),
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
  expect(parseBody('text-body', headers)).toEqual('text-body')
})

test('parses a single stringified number as a valid "application/json" body', () => {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  expect(parseBody('1', headers)).toEqual(1)
})

test('preserves a single stringified number in a "multipart/form-data" body', () => {
  const headers = new Headers({ 'Content-Type': 'multipart/form-data;' })
  expect(parseBody('1', headers)).toEqual('1')
})

test('returns a falsy body as-is', () => {
  expect(parseBody('')).toEqual('')
  expect(parseBody(undefined)).toBeUndefined()
})
