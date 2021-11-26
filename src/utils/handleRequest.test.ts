import { Headers } from 'headers-utils'
import { StrictEventEmitter } from 'strict-event-emitter'
import { ServerLifecycleEventsMap } from '../node/glossary'
import { createMockedRequest } from '../../test/support/utils'
import { SharedOptions } from '../sharedOptions'
import { RequestHandler } from '../handlers/RequestHandler'
import { rest } from '../rest'
import { handleRequest } from './handleRequest'
import { response } from '../response'
import { context } from '..'
import { RequiredDeep } from '../typeUtils'

const emitter = new StrictEventEmitter<ServerLifecycleEventsMap>()
const listener = jest.fn()
function createMockListener(name: string) {
  return (...args: any) => {
    listener(name, ...args)
  }
}
function getEmittedEvents() {
  return listener.mock.calls
}

const options: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: jest.fn(),
}
const callbacks = {
  onBypassResponse: jest.fn(),
  onMockedResponse: jest.fn(),
  onMockedResponseSent: jest.fn(),
}

beforeEach(() => {
  jest.spyOn(global.console, 'warn').mockImplementation()

  emitter.on('request:start', createMockListener('request:start'))
  emitter.on('request:match', createMockListener('request:match'))
  emitter.on('request:unhandled', createMockListener('request:unhandled'))
  emitter.on('request:end', createMockListener('request:end'))
})

afterEach(() => {
  jest.resetAllMocks()
  emitter.removeAllListeners()
})

test('returns undefined for a request with the "x-msw-bypass" header', async () => {
  const request = createMockedRequest({
    url: new URL('http://localhost/user'),
    headers: new Headers({
      'x-msw-bypass': 'true',
    }),
  })
  const handlers: RequestHandler[] = []

  const result = await handleRequest(
    request,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toBeUndefined()
  expect(getEmittedEvents()).toEqual([
    ['request:start', request],
    ['request:end', request],
  ])
  expect(options.onUnhandledRequest).not.toHaveBeenCalled()
  expect(callbacks.onBypassResponse).toHaveBeenNthCalledWith(1, request)
  expect(callbacks.onMockedResponse).not.toHaveBeenCalled()
  expect(callbacks.onMockedResponseSent).not.toHaveBeenCalled()
})

test('reports request as unhandled when it has no matching request handlers', async () => {
  const request = createMockedRequest({
    url: new URL('http://localhost/user'),
  })
  const handlers: RequestHandler[] = []

  const result = await handleRequest(
    request,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toBeUndefined()
  expect(getEmittedEvents()).toEqual([
    ['request:start', request],
    ['request:unhandled', request],
    ['request:end', request],
  ])
  expect(options.onUnhandledRequest).toHaveBeenNthCalledWith(1, request)
  expect(callbacks.onBypassResponse).toHaveBeenNthCalledWith(1, request)
  expect(callbacks.onMockedResponse).not.toHaveBeenCalled()
  expect(callbacks.onMockedResponseSent).not.toHaveBeenCalled()
})

test('returns undefined and warns on a request handler that returns no response', async () => {
  const request = createMockedRequest({
    url: new URL('http://localhost/user'),
  })
  const handlers: RequestHandler[] = [
    rest.get('/user', () => {
      // Intentionally blank response resolver.
      return
    }),
  ]

  const result = await handleRequest(
    request,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toBeUndefined()
  expect(getEmittedEvents()).toEqual([
    ['request:start', request],
    ['request:end', request],
  ])
  expect(options.onUnhandledRequest).not.toHaveBeenCalled()
  expect(callbacks.onBypassResponse).toHaveBeenNthCalledWith(1, request)
  expect(callbacks.onMockedResponse).not.toHaveBeenCalled()
  expect(callbacks.onMockedResponseSent).not.toHaveBeenCalled()

  expect(console.warn).toHaveBeenCalledTimes(1)
  const warning = (console.warn as unknown as jest.SpyInstance).mock.calls[0][0]

  expect(warning).toContain(
    '[MSW] Expected response resolver to return a mocked response Object, but got undefined. The original response is going to be used instead.',
  )
  expect(warning).toContain('GET /user')
  expect(warning).toMatch(/\d+:\d+/)
})

test('returns the mocked response for a request with a matching request handler', async () => {
  const request = createMockedRequest({
    url: new URL('http://localhost/user'),
  })
  const mockedResponse = await response(context.json({ firstName: 'John' }))
  const handlers: RequestHandler[] = [
    rest.get('/user', () => {
      return mockedResponse
    }),
  ]
  const lookupResult = {
    handler: handlers[0],
    response: mockedResponse,
    publicRequest: { ...request, params: {} },
    parsedRequest: { matches: true, params: {} },
  }

  const result = await handleRequest(
    request,
    handlers,
    options,
    emitter,
    callbacks,
  )

  expect(result).toEqual(mockedResponse)
  expect(getEmittedEvents()).toEqual([
    ['request:start', request],
    ['request:match', request],
    ['request:end', request],
  ])
  expect(callbacks.onBypassResponse).not.toHaveBeenCalled()
  expect(callbacks.onMockedResponse).toHaveBeenNthCalledWith(
    1,
    mockedResponse,
    lookupResult,
  )
  expect(callbacks.onMockedResponseSent).toHaveBeenNthCalledWith(
    1,
    mockedResponse,
    lookupResult,
  )
})

test('returns a transformed response if the "transformResponse" option is provided', async () => {
  const request = createMockedRequest({
    url: new URL('http://localhost/user'),
  })
  const mockedResponse = await response(context.json({ firstName: 'John' }))
  const handlers: RequestHandler[] = [
    rest.get('/user', () => {
      return mockedResponse
    }),
  ]
  const transformResponse = jest.fn().mockImplementation((response) => ({
    body: response.body,
  }))
  const finalResponse = transformResponse(mockedResponse)
  const lookupResult = {
    handler: handlers[0],
    response: mockedResponse,
    publicRequest: { ...request, params: {} },
    parsedRequest: { matches: true, params: {} },
  }

  const result = await handleRequest(request, handlers, options, emitter, {
    ...callbacks,
    transformResponse,
  })

  expect(result).toEqual(finalResponse)
  expect(getEmittedEvents()).toEqual([
    ['request:start', request],
    ['request:match', request],
    ['request:end', request],
  ])
  expect(callbacks.onBypassResponse).not.toHaveBeenCalled()
  expect(transformResponse).toHaveBeenNthCalledWith(1, mockedResponse)
  expect(callbacks.onMockedResponse).toHaveBeenNthCalledWith(
    1,
    finalResponse,
    lookupResult,
  )
  expect(callbacks.onMockedResponseSent).toHaveBeenNthCalledWith(
    1,
    finalResponse,
    lookupResult,
  )
})
