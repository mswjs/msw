import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./status.mocks.ts', import.meta.url)

test('sets given status code on the mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await fetch('/posts')
  expect(response.status()).toBe(403)
  expect(response.statusText()).toBe('Forbidden')
})

test('supports custom status text on the mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const response = await fetch('/user')
  expect(response.status()).toBe(401)
  expect(response.statusText()).toBe('Custom text')
})
