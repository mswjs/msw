import * as path from 'path'
import { pageWith } from 'page-with'

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

test('uses explicit server response delay', async () => {
  const runtime = await createRuntime()
  const res = await runtime.request('/delay?duration=1200')
  const timing = res.request().timing()

  expect(timing.responseStart).toRoughlyEqual(1200, 250)

  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(status).toBe(200)
  expect(body).toEqual({ mocked: true })
})

test('uses realistic server response delay when no delay value is provided', async () => {
  const runtime = await createRuntime()
  const res = await runtime.request('/delay')
  const timing = res.request().timing()

  expect(timing.responseStart).toRoughlyEqual(250, 200)

  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(status).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})

test('uses realistic server response delay when "real" delay mode is provided', async () => {
  const runtime = await createRuntime()
  const res = await runtime.request('/delay?mode=real')
  const timing = res.request().timing()

  expect(timing.responseStart).toRoughlyEqual(250, 200)

  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(status).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})
