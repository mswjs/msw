import { test, expect } from '../playwright.extend'

test('returns a plain Response as a mocked response', async ({
  loadExample,
  fetch,
  spyOnConsole,
}) => {
  await loadExample(new URL('./plain-response.mocks.ts', import.meta.url))
  const consoleSpy = spyOnConsole()

  const response = await fetch('/greeting')
  const status = response.status()
  const body = await response.text()

  // Must return the correct response.
  expect(status).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(body).toEqual('Hello, world!')

  // Must print the correct log message in the console.
  expect(consoleSpy.get('startGroupCollapsed')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/\[MSW\] \d{2}:\d{2}:\d{2} GET \/greeting 200 OK/),
    ]),
  )
})
