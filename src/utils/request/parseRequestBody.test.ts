import { parseRequestBody } from './parseRequestBody'
import { Headers } from 'headers-utils/lib'

test('parses a given body string if the "Content-Type:*/json" header is set', () => {
  expect(
    parseRequestBody(
      `{"property":2}`,
      new Headers({ 'Content-Type': 'application/json' }),
    ),
  ).toEqual({
    property: 2,
  })
})

test('returns an invalid JSON body as-is even if the "Content-Type:*/json" header is set', () => {
  expect(
    parseRequestBody(
      'text-body',
      new Headers({ 'Content-Type': 'application/json' }),
    ),
  ).toBe('text-body')
})

test('returns a falsy body as-is', () => {
  expect(parseRequestBody('')).toBe('')
  expect(parseRequestBody(undefined)).toBeUndefined()
})
