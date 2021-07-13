/**
 * @jest-environment jsdom
 */
import { pruneGetRequestBody } from './pruneGetRequestBody'

test('sets empty GET request body to undefined', () => {
  const body = pruneGetRequestBody({
    method: 'GET',
    body: '',
  })

  expect(body).toBeUndefined()
})

test('preserves non-empty GET request body', () => {
  const body = pruneGetRequestBody({
    method: 'GET',
    body: 'text-body',
  })

  expect(body).toBe('text-body')
})

test('ignores requests of the other method than GET', () => {
  expect(
    pruneGetRequestBody({
      method: 'HEAD',
      body: JSON.stringify({ a: 1 }),
    }),
  ).toBe(JSON.stringify({ a: 1 }))

  expect(
    pruneGetRequestBody({
      method: 'POST',
      body: 'text-body',
    }),
  ).toBe('text-body')
})
