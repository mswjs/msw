import { test, expect } from '../../../playwright.extend'

test('responds with a range of a mocked buffer response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(
    new URL('./body-arraybuffer-range.mocks.ts', import.meta.url),
  )

  const response = await fetch('/resource', {
    headers: {
      range: 'bytes=4-8',
    },
  })

  expect.soft(response.status()).toBe(206)
  await expect.soft(response.text()).resolves.toBe('o wo')
})
