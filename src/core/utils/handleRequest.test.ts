/**
 * @jest-environment jsdom
 */
import { Headers } from 'headers-polyfill'
import { Emitter } from 'strict-event-emitter'
import { LifeCycleEventsMap, SharedOptions } from '../sharedOptions'
import { RequestHandler } from '../handlers/RequestHandler'
import { rest } from '../rest'
import { handleRequest, HandleRequestOptions } from './handleRequest'
import { RequiredDeep } from '../typeUtils'
import { uuidv4 } from './internal/uuidv4'
import { HttpResponse } from '../HttpResponse'
import { passthrough } from '../passthrough'

const options: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: jest.fn(),
}
const callbacks: Partial<Record<keyof HandleRequestOptions, any>> = {
  onPassthroughResponse: jest.fn(),
  onMockedResponse: jest.fn(),
}

function setup() {
  const emitter = new Emitter<LifeCycleEventsMap>()
  const listener = jest.fn()

  const createMockListener = (name: string) => {
    return (...args: any) => {
      listener(name, ...args)
    }
  }

  emitter.on('request:start', createMockListener('request:start'))
  emitter.on('request:match', createMockListener('request:match'))
  emitter.on('request:unhandled', createMockListener('request:unhandled'))
  emitter.on('request:end', createMockListener('request:end'))
  emitter.on('response:mocked', createMockListener('response:mocked'))
  emitter.on('response:bypass', createMockListener('response:bypass'))

  const events = listener.mock.calls
  return { emitter, events }
}

beforeEach(() => {
  jest.spyOn(global.console, 'warn').mockImplementation()
})

afterEach(() => {
  jest.resetAllMocks()
})

test('returns undefined for a request with the "x-msw-intention" header equal to "bypass"', async () => {
  const { emitter, events } = setup()

  const requestId = uuidv4()
  const request = new Request(new URL('http://localhost/user'), {
    headers: new Headers({
      'x-msw-intention': 'bypass',
    }),
  })
  const handlers: Array<RequestHandler> = []

  const result = await handleRequest(
    request,
    requestId,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toBeUndefined()
  expect(events).toEqual([
    ['request:start', { request, requestId }],
    ['request:end', { request, requestId }],
  ])
  expect(options.onUnhandledRequest).not.toHaveBeenCalled()
  expect(callbacks.onPassthroughResponse).toHaveBeenNthCalledWith(1, request)
  expect(callbacks.onMockedResponse).not.toHaveBeenCalled()
})

test('does not bypass a request with "x-msw-intention" header set to arbitrary value', async () => {
  const { emitter } = setup()

  const request = new Request(new URL('http://localhost/user'), {
    headers: new Headers({
      'x-msw-intention': 'invalid',
    }),
  })
  const handlers: Array<RequestHandler> = [
    rest.get('/user', () => {
      return HttpResponse.text('hello world')
    }),
  ]

  const result = await handleRequest(
    request,
    uuidv4(),
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).not.toBeUndefined()
  expect(options.onUnhandledRequest).not.toHaveBeenCalled()
  expect(callbacks.onMockedResponse).toHaveBeenCalledTimes(1)
})

test('reports request as unhandled when it has no matching request handlers', async () => {
  const { emitter, events } = setup()

  const requestId = uuidv4()
  const request = new Request(new URL('http://localhost/user'))
  const handlers: Array<RequestHandler> = []

  const result = await handleRequest(
    request,
    requestId,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toBeUndefined()
  expect(events).toEqual([
    ['request:start', { request, requestId }],
    ['request:unhandled', { request, requestId }],
    ['request:end', { request, requestId }],
  ])
  expect(options.onUnhandledRequest).toHaveBeenNthCalledWith(1, request, {
    warning: expect.any(Function),
    error: expect.any(Function),
  })
  expect(callbacks.onPassthroughResponse).toHaveBeenNthCalledWith(1, request)
  expect(callbacks.onMockedResponse).not.toHaveBeenCalled()
})

test('returns undefined on a request handler that returns no response', async () => {
  const { emitter, events } = setup()

  const requestId = uuidv4()
  const request = new Request(new URL('http://localhost/user'))
  const handlers: Array<RequestHandler> = [
    rest.get('/user', () => {
      // Intentionally blank response resolver.
      return
    }),
  ]

  const result = await handleRequest(
    request,
    requestId,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toBeUndefined()
  expect(events).toEqual([
    ['request:start', { request, requestId }],
    ['request:end', { request, requestId }],
  ])
  expect(options.onUnhandledRequest).not.toHaveBeenCalled()
  expect(callbacks.onPassthroughResponse).toHaveBeenNthCalledWith(1, request)
  expect(callbacks.onMockedResponse).not.toHaveBeenCalled()

  /**
   * @note Returning undefined from a resolver no longer prints a warning.
   */
  expect(console.warn).toHaveBeenCalledTimes(0)
})

test('returns the mocked response for a request with a matching request handler', async () => {
  const { emitter, events } = setup()

  const requestId = uuidv4()
  const request = new Request(new URL('http://localhost/user'))
  const mockedResponse = HttpResponse.json({ firstName: 'John' })
  const handlers: Array<RequestHandler> = [
    rest.get('/user', () => {
      return mockedResponse
    }),
  ]
  const lookupResult = {
    handler: handlers[0],
    response: mockedResponse,
    request,
    parsedRequest: {
      match: { matches: true, params: {} },
      cookies: {},
    },
  }

  const result = await handleRequest(
    request,
    requestId,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toEqual(mockedResponse)
  expect(events).toEqual([
    ['request:start', { request, requestId }],
    ['request:match', { request, requestId }],
    ['request:end', { request, requestId }],
  ])
  expect(callbacks.onPassthroughResponse).not.toHaveBeenCalled()

  expect(callbacks.onMockedResponse).toHaveBeenCalledTimes(1)
  const [mockedResponseParam, lookupResultParam] =
    callbacks.onMockedResponse.mock.calls[0]

  expect(mockedResponseParam.status).toBe(mockedResponse.status)
  expect(mockedResponseParam.statusText).toBe(mockedResponse.statusText)
  expect(Object.fromEntries(mockedResponseParam.headers.entries())).toEqual(
    Object.fromEntries(mockedResponse.headers.entries()),
  )

  expect(lookupResultParam).toEqual({
    handler: lookupResult.handler,
    parsedRequest: lookupResult.parsedRequest,
    response: expect.objectContaining({
      status: lookupResult.response.status,
      statusText: lookupResult.response.statusText,
    }),
  })
})

test('returns a transformed response if the "transformResponse" option is provided', async () => {
  const { emitter, events } = setup()

  const requestId = uuidv4()
  const request = new Request(new URL('http://localhost/user'))
  const mockedResponse = HttpResponse.json({ firstName: 'John' })
  const handlers: Array<RequestHandler> = [
    rest.get('/user', () => {
      return mockedResponse
    }),
  ]
  const transformResponseImpelemntation = (response: Response): Response => {
    return new Response('transformed', response)
  }
  const transformResponse = jest
    .fn<Response, [Response]>()
    .mockImplementation(transformResponseImpelemntation)
  const finalResponse = transformResponseImpelemntation(mockedResponse)
  const lookupResult = {
    handler: handlers[0],
    response: mockedResponse,
    request,
    parsedRequest: {
      match: { matches: true, params: {} },
      cookies: {},
    },
  }

  const result = await handleRequest(
    request,
    requestId,
    handlers,
    options,
    emitter,
    {
      ...callbacks,
      transformResponse,
    },
  )

  expect(result?.status).toEqual(finalResponse.status)
  expect(result?.statusText).toEqual(finalResponse.statusText)
  expect(Object.fromEntries(result!.headers.entries())).toEqual(
    Object.fromEntries(mockedResponse.headers.entries()),
  )

  expect(events).toEqual([
    ['request:start', { request, requestId }],
    ['request:match', { request, requestId }],
    ['request:end', { request, requestId }],
  ])
  expect(callbacks.onPassthroughResponse).not.toHaveBeenCalled()

  expect(transformResponse).toHaveBeenCalledTimes(1)
  const [responseParam] = transformResponse.mock.calls[0]

  expect(responseParam.status).toBe(mockedResponse.status)
  expect(responseParam.statusText).toBe(mockedResponse.statusText)
  expect(Object.fromEntries(responseParam.headers.entries())).toEqual(
    Object.fromEntries(mockedResponse.headers.entries()),
  )

  expect(callbacks.onMockedResponse).toHaveBeenCalledTimes(1)
  const [mockedResponseParam, lookupResultParam] =
    callbacks.onMockedResponse.mock.calls[0]

  expect(mockedResponseParam.status).toBe(finalResponse.status)
  expect(mockedResponseParam.statusText).toBe(finalResponse.statusText)
  expect(Object.fromEntries(mockedResponseParam.headers.entries())).toEqual(
    Object.fromEntries(mockedResponse.headers.entries()),
  )
  expect(await mockedResponseParam.text()).toBe('transformed')

  expect(lookupResultParam).toEqual({
    handler: lookupResult.handler,
    parsedRequest: lookupResult.parsedRequest,
    response: expect.objectContaining({
      status: lookupResult.response.status,
      statusText: lookupResult.response.statusText,
    }),
  })
})

it('returns undefined without warning on a passthrough request', async () => {
  const { emitter, events } = setup()

  const requestId = uuidv4()
  const request = new Request(new URL('http://localhost/user'))
  const handlers: Array<RequestHandler> = [
    rest.get('/user', () => {
      return passthrough()
    }),
  ]

  const result = await handleRequest(
    request,
    requestId,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toBeUndefined()
  expect(events).toEqual([
    ['request:start', { request, requestId }],
    ['request:end', { request, requestId }],
  ])
  expect(options.onUnhandledRequest).not.toHaveBeenCalled()
  expect(callbacks.onPassthroughResponse).toHaveBeenNthCalledWith(1, request)
  expect(callbacks.onMockedResponse).not.toHaveBeenCalled()
})
