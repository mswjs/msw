import {
  onUnhandledRequest,
  UnhandledRequestCallback,
} from './onUnhandledRequest'
import { createMockedRequest } from '../../../test/support/utils'
import { RestHandler, RESTMethods } from '../../handlers/RestHandler'
import { ResponseResolver } from '../../handlers/RequestHandler'

const resolver: ResponseResolver = () => void 0

const fixtures = {
  warningWithoutSuggestions: `\
[MSW] Warning: captured a request without a matching request handler:

  • GET http://localhost/api

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`,

  errorWithoutSuggestions: `\
[MSW] Error: captured a request without a matching request handler:

  • GET http://localhost/api

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`,

  warningWithSuggestions: (suggestions: string) => `\
[MSW] Warning: captured a request without a matching request handler:

  • GET http://localhost/api

Did you mean to request one of the following resources instead?

${suggestions}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`,
}

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation()
  jest.spyOn(console, 'error').mockImplementation()
})

afterEach(() => {
  jest.resetAllMocks()
})

afterAll(() => {
  jest.restoreAllMocks()
})

test('supports the "bypass" request strategy', () => {
  onUnhandledRequest(createMockedRequest(), [], 'bypass')

  expect(console.warn).not.toHaveBeenCalled()
  expect(console.error).not.toHaveBeenCalled()
})

test('supports the "warn" request strategy', () => {
  onUnhandledRequest(
    createMockedRequest({
      url: new URL('http://localhost/api'),
    }),
    [],
    'warn',
  )

  expect(console.warn).toHaveBeenCalledWith(fixtures.warningWithoutSuggestions)
})

test('supports the "error" request strategy', () => {
  expect(() =>
    onUnhandledRequest(
      createMockedRequest({
        url: new URL('http://localhost/api'),
      }),
      [],
      'error',
    ),
  ).toThrow(
    '[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
  )

  expect(console.error).toHaveBeenCalledWith(fixtures.errorWithoutSuggestions)
})

test('supports a custom callback function', () => {
  const callback = jest.fn<void, Parameters<UnhandledRequestCallback>>(
    (request) => {
      console.warn(`callback: ${request.method} ${request.url.href}`)
    },
  )
  const request = createMockedRequest({
    url: new URL('/user', 'http://localhost:3000'),
  })
  onUnhandledRequest(request, [], callback)

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

test('supports calling default strategies from the custom callback function', () => {
  const callback = jest.fn<void, Parameters<UnhandledRequestCallback>>(
    (request, print) => {
      console.warn(`custom callback: ${request.id}`)

      // Call the default "error" strategy.
      print.error()
    },
  )
  const request = createMockedRequest({
    id: 'request-1',
    url: new URL('http://localhost/api'),
  })
  expect(() => onUnhandledRequest(request, [], callback)).toThrow(
    `[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.`,
  )

  expect(callback).toHaveBeenCalledTimes(1)
  expect(callback).toHaveBeenCalledWith(request, {
    warning: expect.any(Function),
    error: expect.any(Function),
  })

  // Check that the custom logic in the callback was called.
  expect(console.warn).toHaveBeenCalledWith('custom callback: request-1')

  // Check that the default strategy was called.
  expect(console.error).toHaveBeenCalledWith(fixtures.errorWithoutSuggestions)
})

test('does not print any suggestions given no handlers to suggest', () => {
  onUnhandledRequest(
    createMockedRequest({ url: new URL('http://localhost/api') }),
    [],
    'warn',
  )

  expect(console.warn).toHaveBeenCalledWith(fixtures.warningWithoutSuggestions)
})

test('does not print any suggestions given no handlers are similar', () => {
  onUnhandledRequest(
    createMockedRequest({ url: new URL('http://localhost/api') }),
    [
      // None of the defined request handlers match the actual request URL
      // to be used as suggestions.
      new RestHandler(RESTMethods.GET, 'https://api.github.com', resolver),
      new RestHandler(RESTMethods.GET, 'https://api.stripe.com', resolver),
    ],
    'warn',
  )

  expect(console.warn).toHaveBeenCalledWith(fixtures.warningWithoutSuggestions)
})

test('respects RegExp as a request handler method', () => {
  onUnhandledRequest(
    createMockedRequest({ url: new URL('http://localhost/api') }),
    [new RestHandler(/^GE/, 'http://localhost/api', resolver)],
    'warn',
  )

  expect(console.warn).toHaveBeenCalledWith(fixtures.warningWithoutSuggestions)
})

test('sorts the suggestions by relevance', () => {
  onUnhandledRequest(
    createMockedRequest({ url: new URL('http://localhost/api') }),
    [
      new RestHandler(RESTMethods.GET, 'http://localhost/', resolver),
      new RestHandler(RESTMethods.GET, 'http://localhost:9090/api', resolver),
      new RestHandler(RESTMethods.POST, 'http://localhost/api', resolver),
    ],
    'warn',
  )

  expect(console.warn).toHaveBeenCalledWith(
    fixtures.warningWithSuggestions(`\
  • POST http://localhost/api
  • GET http://localhost/`),
  )
})

test('does not print more than 4 suggestions', () => {
  onUnhandledRequest(
    createMockedRequest({ url: new URL('http://localhost/api') }),
    [
      new RestHandler(RESTMethods.GET, 'http://localhost/ap', resolver),
      new RestHandler(RESTMethods.GET, 'http://localhost/api', resolver),
      new RestHandler(RESTMethods.GET, 'http://localhost/api-1', resolver),
      new RestHandler(RESTMethods.GET, 'http://localhost/api-2', resolver),
      new RestHandler(RESTMethods.GET, 'http://localhost/api-3', resolver),
      new RestHandler(RESTMethods.GET, 'http://localhost/api-4', resolver),
    ],
    'warn',
  )

  expect(console.warn).toHaveBeenCalledWith(
    fixtures.warningWithSuggestions(`\
  • GET http://localhost/api
  • GET http://localhost/ap
  • GET http://localhost/api-1
  • GET http://localhost/api-2`),
  )
})

test('throws an exception given unknown request strategy', () => {
  expect(() =>
    onUnhandledRequest(
      createMockedRequest(),
      [],
      // @ts-expect-error Intentional unknown strategy.
      'arbitrary-strategy',
    ),
  ).toThrow(
    '[MSW] Failed to react to an unhandled request: unknown strategy "arbitrary-strategy". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.',
  )
})
