import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./headers-multiple.mocks.ts', import.meta.url)

test('receives all headers from the request header with multiple values', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const headers = new Headers({ 'x-header': 'application/json' })
  headers.append('x-header', 'application/hal+json')

  const response = await fetch('https://test.mswjs.io', {
    method: 'POST',
    headers: Object.fromEntries(headers.entries()),
  })

  expect(response.status()).toBe(200)
  await expect(response.json()).resolves.toEqual({
    /**
     * @fixme Multiple headers value becomes incompatible
     * with the latest testing setup changes.
     */
    'x-header': 'application/json, application/hal+json',
  })
})

test('supports setting a header with multiple values on the mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await fetch('https://test.mswjs.io')

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.toHaveProperty(
    'accept',
    'application/json, image/png',
  )
  await expect(response.json()).resolves.toEqual({
    mocked: true,
  })
})
