/**
 * @jest-environment jsdom
 */
import {
  RestHandler,
  RestRequest,
  RestContext,
  RESTMethods,
} from './RestHandler'
import { createMockedRequest } from '../../test/support/utils'
import { response } from '../response'
import { context } from '..'
import { ResponseResolver } from './RequestHandler'

const resolver: ResponseResolver<RestRequest, RestContext> = (
  req,
  res,
  ctx,
) => {
  return res(
    ctx.json({
      userId: req.params.userId,
    }),
  )
}

const generatorResolver: ResponseResolver<
  RestRequest<'pending' | 'complete'>,
  RestContext
> = function* (req, res, ctx) {
  let count = 0
  while (count < 5) {
    count += 1
    yield res(ctx.body('pending'))
  }
  return res(ctx.body('complete'))
}

describe('info', () => {
  test('exposes request handler information', () => {
    const handler = new RestHandler(RESTMethods.GET, '/user/:userId', resolver)
    expect(handler.info.header).toEqual('GET /user/:userId')
    expect(handler.info.method).toEqual('GET')
    expect(handler.info.path).toEqual('/user/:userId')
  })
})

describe('parse', () => {
  test('parses a URL given a matching request', () => {
    const handler = new RestHandler(RESTMethods.GET, '/user/:userId', resolver)
    const request = createMockedRequest({
      url: new URL('/user/abc-123', location.href),
    })

    expect(handler.parse(request)).toEqual({
      matches: true,
      params: {
        userId: 'abc-123',
      },
    })
  })

  test('parses a URL and ignores the request method', () => {
    const handler = new RestHandler(RESTMethods.GET, '/user/:userId', resolver)
    const request = createMockedRequest({
      method: 'POST',
      url: new URL('/user/def-456', location.href),
    })

    expect(handler.parse(request)).toEqual({
      matches: true,
      params: {
        userId: 'def-456',
      },
    })
  })

  test('returns negative match result given a non-matching request', () => {
    const handler = new RestHandler(RESTMethods.GET, '/user/:userId', resolver)
    const request = createMockedRequest({
      url: new URL('/login', location.href),
    })

    expect(handler.parse(request)).toEqual({
      matches: false,
      params: {},
    })
  })
})

describe('predicate', () => {
  test('returns true given a matching request', () => {
    const handler = new RestHandler(RESTMethods.POST, '/login', resolver)
    const request = createMockedRequest({
      method: 'POST',
      url: new URL('/login', location.href),
    })

    expect(handler.predicate(request, handler.parse(request))).toBe(true)
  })

  test('respects RegExp as the request method', () => {
    const handler = new RestHandler(/.+/, '/login', resolver)
    const requests = [
      createMockedRequest({ url: new URL('/login', location.href) }),
      createMockedRequest({
        method: 'POST',
        url: new URL('/login', location.href),
      }),
      createMockedRequest({
        method: 'DELETE',
        url: new URL('/login', location.href),
      }),
    ]

    for (const request of requests) {
      expect(handler.predicate(request, handler.parse(request))).toBe(true)
    }
  })

  test('returns false given a non-matching request', () => {
    const handler = new RestHandler(RESTMethods.POST, '/login', resolver)
    const request = createMockedRequest({
      url: new URL('/user/abc-123', location.href),
    })

    expect(handler.predicate(request, handler.parse(request))).toBe(false)
  })
})

describe('test', () => {
  test('returns true given a matching request', () => {
    const handler = new RestHandler(RESTMethods.GET, '/user/:userId', resolver)
    const firstTest = handler.test(
      createMockedRequest({
        url: new URL('/user/abc-123', location.href),
      }),
    )
    const secondTest = handler.test(
      createMockedRequest({
        url: new URL('/user/def-456', location.href),
      }),
    )

    expect(firstTest).toBe(true)
    expect(secondTest).toBe(true)
  })

  test('returns false given a non-matching request', () => {
    const handler = new RestHandler(RESTMethods.GET, '/user/:userId', resolver)
    const firstTest = handler.test(
      createMockedRequest({
        url: new URL('/login', location.href),
      }),
    )
    const secondTest = handler.test(
      createMockedRequest({
        url: new URL('/user/', location.href),
      }),
    )
    const thirdTest = handler.test(
      createMockedRequest({
        url: new URL('/user/abc-123/extra', location.href),
      }),
    )

    expect(firstTest).toBe(false)
    expect(secondTest).toBe(false)
    expect(thirdTest).toBe(false)
  })
})

describe('run', () => {
  test('returns a mocked response given a matching request', async () => {
    const handler = new RestHandler(RESTMethods.GET, '/user/:userId', resolver)
    const request = createMockedRequest({
      url: new URL('/user/abc-123', location.href),
    })
    const result = await handler.run(request)

    expect(result).toEqual({
      handler,
      request: {
        ...request,
        params: {
          userId: 'abc-123',
        },
      },
      parsedResult: {
        matches: true,
        params: {
          userId: 'abc-123',
        },
      },
      response: await response(context.json({ userId: 'abc-123' })),
    })
  })

  test('returns null given a non-matching request', async () => {
    const handler = new RestHandler(RESTMethods.POST, '/login', resolver)
    const result = await handler.run(
      createMockedRequest({
        method: 'GET',
        url: new URL('/users', location.href),
      }),
    )

    expect(result).toBeNull()
  })

  test('returns an empty object as "req.params" given request with no URL parameters', async () => {
    const handler = new RestHandler(RESTMethods.GET, '/users', resolver)
    const result = await handler.run(
      createMockedRequest({
        url: new URL('/users', location.href),
      }),
    )

    expect(result?.request.params).toEqual({})
  })
})

describe('run with generator', () => {
  test('Resolver runs until generator completes', async () => {
    const handler = new RestHandler(
      RESTMethods.GET,
      '/users',
      generatorResolver,
    )
    const run = async () => {
      const result = await handler.run(
        createMockedRequest({
          url: new URL('/users', location.href),
        }),
      )
      return result?.response?.body
    }

    expect(await run()).toBe('pending')
    expect(await run()).toBe('pending')
    expect(await run()).toBe('pending')
    expect(await run()).toBe('pending')
    expect(await run()).toBe('pending')
    expect(await run()).toBe('complete')
    expect(await run()).toBe('complete')
    expect(handler.shouldSkip).toBe(false)
  })
})
