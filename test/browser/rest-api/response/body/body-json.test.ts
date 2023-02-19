import { test, expect } from '../../../playwright.extend'

test('responds with a JSON response body', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./body-json.mocks.ts'))

  const res = await fetch('/json')
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(json).toEqual({ firstName: 'John' })
})

test('responds with a single number JSON response body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./body-json.mocks.ts'))

  const res = await fetch('/number')
  const headers = await res.allHeaders()
  const json = await res.json()

  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(json).toEqual(123)
})
