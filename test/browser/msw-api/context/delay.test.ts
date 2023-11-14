import { test, expect } from '../../playwright.extend'

const DELAY_EXAMPLE = require.resolve('./delay.mocks.ts')

declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toRoughlyEqual(expected: number, deviation: number): R
    }
  }
}

expect.extend({
  /**
   * Asserts a given actual number to roughly equal to the expected number,
   * taking the maximum allowed delta `deviation` into account.
   */
  toRoughlyEqual(actual: number, expected: number, deviation: number) {
    const diff = Math.abs(actual - expected)
    const passes = diff <= deviation

    if (passes) {
      return {
        pass: true,
        message: () =>
          `expected ${actual} not to be roughly equal to ${expected} (deviation: ${deviation})`,
      }
    }

    return {
      pass: false,
      message: () =>
        `expected ${actual} to be roughly equal to ${expected} (deviation: ${deviation})`,
    }
  },
})

test('uses explicit server response delay', async ({ loadExample, fetch }) => {
  await loadExample(DELAY_EXAMPLE)

  const res = await fetch('/delay?duration=1200')
  const timing = res.request().timing()

  expect(timing.responseStart).toRoughlyEqual(1200, 250)

  const status = res.status()
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(status).toBe(200)
  expect(body).toEqual({ mocked: true })
})

test('uses realistic server response delay when no delay value is provided', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(DELAY_EXAMPLE)

  const res = await fetch('/delay')
  const timing = res.request().timing()

  expect(timing.responseStart).toRoughlyEqual(250, 300)

  const status = res.status()
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(status).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})

test('uses realistic server response delay when "real" delay mode is provided', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(DELAY_EXAMPLE)
  const res = await fetch('/delay?mode=real')
  const timing = res.request().timing()

  expect(timing.responseStart).toRoughlyEqual(250, 300)

  const status = res.status()
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(status).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})
