// @vitest-environment node
import { setupServer } from 'msw/node'
import { delay, HttpResponse, http } from 'msw'

const SYSTEM_TIME = new Date('2024-01-01T00:00:00.000Z')

const server = setupServer()

/**
 * @note Measure real elapsed time via `process.hrtime`, which fake timers
 * never mock. The tests must not advance the fake clock manually.
 */
function measureRealTime(): () => number {
  const start = process.hrtime.bigint()
  return () => Number(process.hrtime.bigint() - start) / 1_000_000
}

beforeAll(() => {
  server.listen()
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(SYSTEM_TIME)
})

afterEach(() => {
  vi.useRealTimers()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('supports fake timers without any delay in the handlers', async () => {
  server.use(
    http.get('https://test.mswjs.io/pull', () => {
      return HttpResponse.json({ status: 'pulled' })
    }),
  )

  const response = await fetch('https://test.mswjs.io/pull')
  await expect(response.json()).resolves.toEqual({ status: 'pulled' })
})

test('delays the response with fake timers enabled without advancing the time', async () => {
  server.use(
    http.get('https://test.mswjs.io/delayed', async () => {
      await delay(500)
      return HttpResponse.text('john')
    }),
  )

  const getElapsedTime = measureRealTime()

  const response = await fetch('https://test.mswjs.io/delayed')
  const responseTime = getElapsedTime()

  expect(responseTime).toBeGreaterThanOrEqual(500)
  await expect(response.text()).resolves.toBe('john')

  // No need to advance the timers to get a delayed mock response.
  expect(Date.now()).toBe(SYSTEM_TIME.getTime())
})
