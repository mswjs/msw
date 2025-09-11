import { test, expect } from '../playwright.extend'

test('mocks responses when using fake timers in tests', async ({
  loadExample,
  page,
  fetch,
}) => {
  await loadExample(new URL('./fake-timers.mock.js', import.meta.url))

  await page.evaluate(() => {
    Date.now = () => 0
  })

  const response = await fetch('/resource')

  await expect(response.text()).resolves.toBe('hello world')
})
