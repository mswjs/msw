/**
 * @vitest-environment jsdom
 */
import {
  onUnhandledRequest,
  UnhandledRequestCallback,
} from './onUnhandledRequest'

const fixtures = {
  warningWithoutSuggestions: `\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET /api

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`,

  errorWithoutSuggestions: `\
[MSW] Error: intercepted a request without a matching request handler:

  • GET /api

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`,
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => void 0)
  vi.spyOn(console, 'error').mockImplementation(() => void 0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('supports the "bypass" request strategy', async () => {
  await onUnhandledRequest(
    new Request(new URL('http://localhost/api')),
    'bypass',
  )

  expect(console.warn).not.toHaveBeenCalled()
  expect(console.error).not.toHaveBeenCalled()
})

test('supports the "warn" request strategy', async () => {
  await onUnhandledRequest(new Request(new URL('http://localhost/api')), 'warn')

  expect(console.warn).toHaveBeenCalledWith(fixtures.warningWithoutSuggestions)
})

test('supports the "error" request strategy', async () => {
  await expect(
    onUnhandledRequest(new Request(new URL('http://localhost/api')), 'error'),
  ).rejects.toThrow(
    '[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
  )

  expect(console.error).toHaveBeenCalledWith(fixtures.errorWithoutSuggestions)
})

test('supports a custom callback function', async () => {
  const callback = vi.fn<Parameters<UnhandledRequestCallback>>((request) => {
    console.warn(`callback: ${request.method} ${request.url}`)
  })
  const request = new Request(new URL('/user', 'http://localhost:3000'))
  await onUnhandledRequest(request, callback)

  expect(callback).toHaveBeenCalledTimes(1)
  expect(callback).toHaveBeenCalledWith(request, {
    warning: expect.any(Function),
    error: expect.any(Function),
  })

  // Check that the custom logic in the callback was called.
  expect(console.warn).toHaveBeenCalledWith(
    `callback: GET http://localhost:3000/user`,
  )
})

test('supports calling default strategies from the custom callback function', async () => {
  const callback = vi.fn<Parameters<UnhandledRequestCallback>>(
    (request, print) => {
      // Call the default "error" strategy.
      print.error()
    },
  )
  const request = new Request(new URL('http://localhost/api'))
  await expect(onUnhandledRequest(request, callback)).rejects.toThrow(
    `[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.`,
  )

  expect(callback).toHaveBeenCalledTimes(1)
  expect(callback).toHaveBeenCalledWith(request, {
    warning: expect.any(Function),
    error: expect.any(Function),
  })

  // Check that the default strategy was called.
  expect(console.error).toHaveBeenCalledWith(fixtures.errorWithoutSuggestions)
})

test('does not print any suggestions given no handlers to suggest', async () => {
  await onUnhandledRequest(new Request(new URL('http://localhost/api')), 'warn')

  expect(console.warn).toHaveBeenCalledWith(fixtures.warningWithoutSuggestions)
})

test('throws an exception given unknown request strategy', async () => {
  await expect(
    onUnhandledRequest(
      new Request(new URL('http://localhost/api')),
      // @ts-expect-error Intentional unknown strategy.
      'invalid-strategy',
    ),
  ).rejects.toThrow(
    '[MSW] Failed to react to an unhandled request: unknown strategy "invalid-strategy". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.',
  )
})
