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

test('returns a falsy body as-is', () => {
  expect(parseBody('')).toBe('')
  expect(parseBody(undefined)).toBeUndefined()
})
