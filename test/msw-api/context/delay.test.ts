import type { DelayMode } from 'msw'
import { http, delay, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

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

const handlers = [
  http.get('*/delay', async ({ request }) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') as DelayMode
    const duration = url.searchParams.get('duration')

    await delay(duration ? Number(duration) : mode || undefined)

    return HttpResponse.json({ mocked: true })
  }),
]

const test = defineNetwork({ handlers })

test('uses explicit server response delay', async ({ fetch }) => {
  const startedAt = performance.now()
  const res = await fetch('/delay?duration=1200')
  const responseStart = performance.now() - startedAt

  expect(responseStart).toRoughlyEqual(1200, 250)

  const status = res.status()
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(status).toBe(200)
  expect(body).toEqual({ mocked: true })
})

test('uses realistic server response delay when no delay value is provided', async ({
  fetch,
}) => {
  const startedAt = performance.now()
  const res = await fetch('/delay')
  const responseStart = performance.now() - startedAt

  expect(responseStart).toRoughlyEqual(250, 300)

  const status = res.status()
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(status).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})

test('uses realistic server response delay when "real" delay mode is provided', async ({
  fetch,
}) => {
  const startedAt = performance.now()
  const res = await fetch('/delay?mode=real')
  const responseStart = performance.now() - startedAt

  expect(responseStart).toRoughlyEqual(250, 300)

  const status = res.status()
  const body = await res.json()

  expect(res.fromServiceWorker()).toBe(true)
  expect(status).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})
