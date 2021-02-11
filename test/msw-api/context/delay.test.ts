import * as path from 'path'
import { Page, pageWith } from 'page-with'

declare global {
  namespace jest {
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

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'delay.mocks.ts'),
  })
}

function performanceNow(page: Page) {
  return page.evaluate(() => new Date().getTime())
}

test('uses explicit server response delay', async () => {
  const runtime = await createRuntime()
  const startPerf = await performanceNow(runtime.page)
  const res = await runtime.request('/delay?duration=1200')
  const endPerf = await performanceNow(runtime.page)

  const responseTime = endPerf - startPerf
  expect(responseTime).toRoughlyEqual(1200, 250)

  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(status).toBe(200)
  expect(body).toEqual({ mocked: true })
})

test('uses realistic server response delay when no delay value is provided', async () => {
  const runtime = await createRuntime()
  const startPerf = await performanceNow(runtime.page)
  const res = await runtime.request('/delay')
  const endPerf = await performanceNow(runtime.page)

  // Actual response time should lie within min/max boundaries
  // of the random realistic response time.
  const responseTime = endPerf - startPerf
  expect(responseTime).toRoughlyEqual(250, 200)

  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(status).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})

test('uses realistic server response delay when "real" delay mode is provided', async () => {
  const runtime = await createRuntime()
  const startPerf = await performanceNow(runtime.page)
  const res = await runtime.request('/delay?mode=real')
  const endPerf = await performanceNow(runtime.page)

  // Actual response time should lie within min/max boundaries
  // of the random realistic response time.
  const responseTime = endPerf - startPerf
  expect(responseTime).toRoughlyEqual(250, 200)

  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(status).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})
