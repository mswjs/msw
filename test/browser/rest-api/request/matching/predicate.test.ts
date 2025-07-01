import { test, expect } from '../../../playwright.extend'

const PREDICATE_EXAMPLE = require.resolve('./predicate.mocks.ts')

test('matches requests when the predicate function returns true', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(PREDICATE_EXAMPLE)
  const res = await fetch('/api/foo', {
    method: 'POST',
    body: JSON.stringify({ foo: 'bar' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({ matched: true })
})

test('does not match requests when the predicate function returns false', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(PREDICATE_EXAMPLE)
  const res = await fetch('/api/foo', {
    method: 'POST',
    body: JSON.stringify({ foo: 'baz' }),
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status()).toBe(404)
})
