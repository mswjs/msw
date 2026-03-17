import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./status.mocks.ts', import.meta.url)

test('sets given status code on the mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/posts')
  const status = res.status()
  const statusText = res.statusText()

  expect(status).toBe(403)
  expect(statusText).toBe('Forbidden')
})

test('supports custom status text on the mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('/user')
  const status = res.status()
  const statusText = res.statusText()

  expect(status).toBe(401)
  expect(statusText).toBe('Custom text')
})
