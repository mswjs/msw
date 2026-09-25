// @vitest-environment node
import { setupServer } from 'msw/node'
import { delay, HttpResponse, http } from 'msw'

const SYSTEM_TIME = new Date('2024-01-01T00:00:00.000Z')

const server = setupServer()

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

test('delays the response when advancing the fake timers', async () => {
  server.use(
    http.get('https://test.mswjs.io/delayed', async () => {
      await delay(500)
      return HttpResponse.text('john')
    }),
  )

  const responseListener = vi.fn()
  const responsePromise = fetch('https://test.mswjs.io/delayed').then(
    (response) => {
      responseListener(response)
      return response
    },
  )

  // The delayed response must not resolve until the fake timers
  // have been advanced past the delay duration.
  await vi.advanceTimersByTimeAsync(499)
  expect(responseListener).not.toHaveBeenCalled()

  await vi.advanceTimersByTimeAsync(1)
  const response = await responsePromise

  expect(responseListener).toHaveBeenCalledOnce()
  await expect(response.text()).resolves.toBe('john')

  // The delay advances the fake clock, not the real one.
  expect(Date.now()).toBe(SYSTEM_TIME.getTime() + 500)
})
