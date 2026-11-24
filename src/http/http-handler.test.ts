// @vitest-environment jsdom
import { setTimeout } from 'node:timers/promises'
import { createRequestId, FetchRequest } from '@mswjs/interceptors'
import type { HttpRequestResolverExtras } from './http-handler'
import { HttpHandler } from './http-handler'
import { HttpResponse } from './index'
import type { ResponseResolver } from '#core/handlers/request-handler'

const resolver: ResponseResolver<
  HttpRequestResolverExtras<{ userId: string }>
> = ({ params }) => {
  return HttpResponse.json({ userId: params.userId })
}

describe('info', () => {
  test('exposes request handler information', () => {
    const handler = new HttpHandler('GET', '/user/:userId', resolver)

    expect(handler.info.header).toEqual('GET /user/:userId')
    expect(handler.info.method).toEqual('GET')
    expect(handler.info.path).toEqual('/user/:userId')
    expect(handler.isUsed).toBe(false)
  })
})

describe('parse', () => {
  test('parses a URL given a matching request', async () => {
    const handler = new HttpHandler('GET', '/user/:userId', resolver)
    const request = new Request(new URL('/user/abc-123', location.href))

    expect(await handler.parse({ request })).toEqual({
      match: {
        matches: true,
        params: {
          userId: 'abc-123',
        },
      },
      cookies: {},
    })
  })

  test('parses a URL and ignores the request method', async () => {
    const handler = new HttpHandler('GET', '/user/:userId', resolver)
    const request = new Request(new URL('/user/def-456', location.href), {
      method: 'POST',
    })

    expect(await handler.parse({ request })).toEqual({
      match: {
        matches: true,
        params: {
          userId: 'def-456',
        },
      },
      cookies: {},
    })
  })

  test('returns negative match result given a non-matching request', async () => {
    const handler = new HttpHandler('GET', '/user/:userId', resolver)
    const request = new Request(new URL('/login', location.href))

    expect(await handler.parse({ request })).toEqual({
      match: {
        matches: false,
        params: {},
      },
      cookies: {},
    })
  })
})

describe('predicate', () => {
  /**
   * @todo Decide whether `http.all()` matches CONNECT requests
   * once `http.connect()` is supported.
   */
  test('returns false given a CONNECT request', async () => {
    const handler = new HttpHandler(/.+/, '*', resolver)
    const request = new FetchRequest('http://localhost/127.0.0.1:443', {
      method: 'CONNECT',
    })

    await expect(
      handler.predicate({
        request,
        parsedResult: await handler.parse({ request }),
      }),
    ).resolves.toBe(false)
  })

  test('returns true given a matching request', async () => {
    const handler = new HttpHandler('POST', '/login', resolver)
    const request = new Request(new URL('/login', location.href), {
      method: 'POST',
    })

    await expect(
      handler.predicate({
        request,
        parsedResult: await handler.parse({ request }),
      }),
    ).resolves.toBe(true)
  })

  test('supports RegExp as the request method', async () => {
    const handler = new HttpHandler(/.+/, '/login', resolver)
    const requests = [
      new Request(new URL('/login', location.href)),
      new Request(new URL('/login', location.href), { method: 'POST' }),
      new Request(new URL('/login', location.href), { method: 'DELETE' }),
    ]

    for (const request of requests) {
      await expect(
        handler.predicate({
          request,
          parsedResult: await handler.parse({ request }),
        }),
      ).resolves.toBe(true)
    }
  })

  test('returns false given a non-matching request', async () => {
    const handler = new HttpHandler('POST', '/login', resolver)
    const request = new Request(new URL('/user/abc-123', location.href))

    await expect(
      handler.predicate({
        request,
        parsedResult: await handler.parse({ request }),
      }),
    ).resolves.toBe(false)
  })

  test('supports custom predicate function', async () => {
    const handler = new HttpHandler(
      'GET',
      ({ request }) => {
        return new URL(request.url).searchParams.get('a') === '1'
      },
      resolver,
    )

    {
      const request = new Request(new URL('/login?a=1', location.href))
      await expect(
        handler.predicate({
          request,
          parsedResult: await handler.parse({ request }),
        }),
      ).resolves.toBe(true)
    }

    {
      const request = new Request(new URL('/login', location.href))
      await expect(
        handler.predicate({
          request,
          parsedResult: await handler.parse({ request }),
        }),
      ).resolves.toBe(false)
    }
  })
})

describe('test', () => {
  test('returns true given a matching request', async () => {
    const handler = new HttpHandler('GET', '/user/:userId', resolver)
    const firstTest = await handler.test({
      request: new Request(new URL('/user/abc-123', location.href)),
    })
    const secondTest = await handler.test({
      request: new Request(new URL('/user/def-456', location.href)),
    })

    expect(firstTest).toBe(true)
    expect(secondTest).toBe(true)
  })

  test('returns false given a non-matching request', async () => {
    const handler = new HttpHandler('GET', '/user/:userId', resolver)
    const firstTest = await handler.test({
      request: new Request(new URL('/login', location.href)),
    })
    const secondTest = await handler.test({
      request: new Request(new URL('/user/', location.href)),
    })
    const thirdTest = await handler.test({
      request: new Request(new URL('/user/abc-123/extra', location.href)),
    })

    expect(firstTest).toBe(false)
    expect(secondTest).toBe(false)
    expect(thirdTest).toBe(false)
  })
})

describe('run', () => {
  test('returns a mocked response given a matching request', async () => {
    const handler = new HttpHandler('GET', '/user/:userId', resolver)
    const request = new Request(new URL('/user/abc-123', location.href))
    const requestId = createRequestId()
    const result = await handler.run({ request, requestId })

    expect(result!.handler).toEqual(handler)
    expect(result!.parsedResult).toEqual({
      match: {
        matches: true,
        params: {
          userId: 'abc-123',
        },
      },
      cookies: {},
    })
    expect(result!.request.method).toBe('GET')
    expect(result!.request.url).toBe('http://localhost/user/abc-123')
    expect(result!.response?.status).toBe(200)
    expect(result!.response?.statusText).toBe('OK')
    await expect(result?.response?.json()).resolves.toEqual({
      userId: 'abc-123',
    })
  })

  test('returns null given a non-matching request', async () => {
    const handler = new HttpHandler('POST', '/login', resolver)
    const result = await handler.run({
      request: new Request(new URL('/users', location.href)),
      requestId: createRequestId(),
    })

    expect(result).toBeNull()
  })

  test('returns an empty "params" object given request with no URL parameters', async () => {
    const handler = new HttpHandler('GET', '/users', resolver)
    const result = await handler.run({
      request: new Request(new URL('/users', location.href)),
      requestId: createRequestId(),
    })

    expect(result?.parsedResult?.match?.params).toEqual({})
  })

  test('exhausts resolver until its generator completes', async () => {
    const handler = new HttpHandler('GET', '/users', function* () {
      let count = 0

      while (count < 5) {
        count += 1
        yield HttpResponse.text('pending')
      }

      return HttpResponse.text('complete')
    })

    const run = async () => {
      const result = await handler.run({
        request: new Request(new URL('/users', location.href)),
        requestId: createRequestId(),
      })
      return result?.response?.text()
    }

    await expect(run()).resolves.toBe('pending')
    await expect(run()).resolves.toBe('pending')
    await expect(run()).resolves.toBe('pending')
    await expect(run()).resolves.toBe('pending')
    await expect(run()).resolves.toBe('pending')
    await expect(run()).resolves.toBe('complete')
    await expect(run()).resolves.toBe('complete')
  })

  test('keeps the response of the current generator when a detached one yields', async () => {
    const generatorStarted = Promise.withResolvers<void>()
    const continueGenerator = Promise.withResolvers<void>()
    let generatorCount = 0

    const handler = new HttpHandler('GET', '/users', async function* () {
      generatorCount += 1
      const generatorId = generatorCount

      if (generatorId === 1) {
        generatorStarted.resolve()
        await continueGenerator.promise
      }

      yield HttpResponse.text(`pending ${generatorId}`)
    })

    const run = async () => {
      const result = await handler.run({
        request: new Request(new URL('/users', location.href)),
        requestId: createRequestId(),
      })
      return result?.response?.text()
    }

    const detachedRun = run()
    await generatorStarted.promise

    // Resetting the handler detaches the generator that is still running.
    handler.reset()
    await expect(run()).resolves.toBe('pending 2')

    continueGenerator.resolve()
    await expect(detachedRun).resolves.toBe('pending 1')

    // Must respond with the latest response of the current generator.
    await expect(run()).resolves.toBe('pending 2')
    await expect(run()).resolves.toBe('pending 2')
  })

  test('keeps the current generator running when a detached one completes', async () => {
    const generatorStarted = Promise.withResolvers<void>()
    const continueGenerator = Promise.withResolvers<void>()
    let generatorCount = 0

    const handler = new HttpHandler(
      'GET',
      '/users',
      async function* () {
        generatorCount += 1
        const generatorId = generatorCount

        if (generatorId === 1) {
          generatorStarted.resolve()
          await continueGenerator.promise
          return HttpResponse.text('complete 1')
        }

        yield HttpResponse.text(`pending ${generatorId}`)
        return HttpResponse.text(`complete ${generatorId}`)
      },
      { once: true },
    )

    const run = async () => {
      const result = await handler.run({
        request: new Request(new URL('/users', location.href)),
        requestId: createRequestId(),
      })
      return result?.response?.text()
    }

    const detachedRun = run()
    await generatorStarted.promise

    // Resetting the handler detaches the generator that is still running.
    handler.reset()
    await expect(run()).resolves.toBe('pending 2')

    continueGenerator.resolve()
    await expect(detachedRun).resolves.toBe('complete 1')

    // Must not consider the handler used until the current generator completes.
    await expect(run()).resolves.toBe('complete 2')
    await expect(run()).resolves.toBeUndefined()
  })
})

describe('finalize', () => {
  test('returns the exact response instance if the resolver never accesses finalize', async () => {
    const response = new HttpResponse(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('hello'))
          controller.close()
        },
      }),
    )
    const handler = new HttpHandler('GET', '/resource', () => {
      return response
    })

    const result = await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })

    expect(result?.response).toBe(response)
  })

  test('returns the exact response instance if finalize is accessed but never called', async () => {
    const response = new HttpResponse(
      new ReadableStream({
        start(controller) {
          controller.close()
        },
      }),
    )
    const handler = new HttpHandler('GET', '/resource', ({ finalize }) => {
      expect(finalize).toBeInstanceOf(Function)
      return response
    })

    const result = await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })

    expect(result?.response).toBe(response)
  })

  test('defers the cleanup until the response stream settles', async () => {
    const cleanup = vi.fn()
    const response = new HttpResponse(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('hello'))
          controller.close()
        },
      }),
    )
    const handler = new HttpHandler('GET', '/resource', ({ finalize }) => {
      finalize(cleanup)
      return response
    })

    const result = await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })

    // The observed response is a copy of the original response.
    expect(result?.response).not.toBe(response)
    expect(cleanup).not.toHaveBeenCalled()

    await expect(result?.response?.text()).resolves.toBe('hello')
    await vi.waitFor(() => {
      expect(cleanup).toHaveBeenCalledOnce()
    })
  })

  test('runs the cleanup immediately for responses without a body', async () => {
    const cleanup = vi.fn()
    const handler = new HttpHandler('GET', '/resource', ({ finalize }) => {
      finalize(cleanup)
      return new HttpResponse(null)
    })

    await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })

    expect(cleanup).toHaveBeenCalledOnce()
  })

  test('runs the cleanup when a mid-flight generator resolver is reset', async () => {
    const cleanup = vi.fn()
    const handler = new HttpHandler('GET', '/resource', function* ({
      finalize,
    }) {
      finalize(cleanup)

      yield HttpResponse.text('pending')
      return HttpResponse.text('complete')
    })

    await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })
    expect(cleanup).not.toHaveBeenCalled()

    handler.reset()

    await expect.poll(() => cleanup).toHaveBeenCalledOnce()
  })

  test('runs the cleanup when a mid-flight generator resolver is disposed of', async () => {
    const cleanup = vi.fn()
    const handler = new HttpHandler('GET', '/resource', function* ({
      finalize,
    }) {
      finalize(cleanup)

      yield HttpResponse.text('pending')
      return HttpResponse.text('complete')
    })

    await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })
    expect(cleanup).not.toHaveBeenCalled()

    handler.dispose()

    await expect.poll(() => cleanup).toHaveBeenCalledOnce()
  })

  test('runs the cleanup after the generator itself is cleaned up on reset', async () => {
    const cleanup = vi.fn<(source: string) => void>()
    const handler = new HttpHandler('GET', '/resource', function* ({
      finalize,
    }) {
      finalize(() => cleanup('finalize'))

      try {
        yield HttpResponse.text('pending')
        return HttpResponse.text('complete')
      } finally {
        cleanup('generator')
      }
    })

    await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })

    handler.reset()

    await expect.poll(() => cleanup).toHaveBeenCalledTimes(2)
    expect(cleanup).toHaveBeenNthCalledWith(1, 'generator')
    expect(cleanup).toHaveBeenNthCalledWith(2, 'finalize')
  })

  test('runs the cleanup scheduled while the generator is cleaned up on reset', async () => {
    const cleanup = vi.fn()
    const handler = new HttpHandler('GET', '/resource', function* ({
      finalize,
    }) {
      try {
        yield HttpResponse.text('pending')
        return HttpResponse.text('complete')
      } finally {
        finalize(cleanup)
      }
    })

    await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })

    handler.reset()

    await expect.poll(() => cleanup).toHaveBeenCalledOnce()
  })

  test('runs the cleanup scheduled while the async generator is cleaned up on reset', async () => {
    const cleanup = vi.fn()
    const continueCleanup = Promise.withResolvers<void>()
    const handler = new HttpHandler('GET', '/resource', async function* ({
      finalize,
    }) {
      try {
        yield HttpResponse.text('pending')
        return HttpResponse.text('complete')
      } finally {
        await continueCleanup.promise
        finalize(cleanup)
      }
    })

    const run = async () => {
      const result = await handler.run({
        request: new Request(new URL('/resource', location.href)),
        requestId: createRequestId(),
      })
      return result?.response?.text()
    }

    await expect(run()).resolves.toBe('pending')

    // Start a new generator while the abandoned one is still cleaning up.
    handler.reset()
    await expect(run()).resolves.toBe('pending')
    expect(cleanup).not.toHaveBeenCalled()

    continueCleanup.resolve()

    // Must not wait for the new generator to complete.
    await expect.poll(() => cleanup).toHaveBeenCalledOnce()
  })

  test('keeps the cleanup pending until the resolver completes when reset', async () => {
    const cleanup = vi.fn()
    const resolverStarted = Promise.withResolvers<void>()
    const continueResolver = Promise.withResolvers<void>()
    const handler = new HttpHandler(
      'GET',
      '/resource',
      async ({ finalize }) => {
        finalize(cleanup)
        resolverStarted.resolve()
        await continueResolver.promise

        return new HttpResponse(null)
      },
    )

    const resultPromise = handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })
    await resolverStarted.promise
    expect(cleanup).not.toHaveBeenCalled()

    handler.reset()

    // Give a premature cleanup a chance to run.
    await setTimeout(50)
    expect(cleanup).not.toHaveBeenCalled()

    continueResolver.resolve()
    await resultPromise

    expect(cleanup).toHaveBeenCalledOnce()
  })
})

describe('dispose', () => {
  async function run(handler: HttpHandler) {
    const result = await handler.run({
      request: new Request(new URL('/resource', location.href)),
      requestId: createRequestId(),
    })

    return result?.response?.text()
  }

  test('restarts the generator resolver after the disposal', async () => {
    const handler = new HttpHandler('GET', '/resource', function* () {
      yield HttpResponse.text('pending')
      return HttpResponse.text('complete')
    })

    await expect(run(handler)).resolves.toBe('pending')
    await expect(run(handler)).resolves.toBe('complete')

    handler.dispose()

    await expect(run(handler)).resolves.toBe('pending')
    await expect(run(handler)).resolves.toBe('complete')
  })

  test('runs the generator cleanup when disposed of mid-flight', async () => {
    const cleanup = vi.fn()
    const handler = new HttpHandler('GET', '/resource', function* () {
      try {
        yield HttpResponse.text('pending')
        return HttpResponse.text('complete')
      } finally {
        cleanup()
      }
    })

    await expect(run(handler)).resolves.toBe('pending')
    expect(cleanup).not.toHaveBeenCalled()

    handler.dispose()

    expect(cleanup).toHaveBeenCalledOnce()
  })

  test('runs the async generator cleanup when disposed of mid-flight', async () => {
    const cleanup = vi.fn()
    const handler = new HttpHandler('GET', '/resource', async function* () {
      try {
        yield HttpResponse.text('pending')
        return HttpResponse.text('complete')
      } finally {
        cleanup()
      }
    })

    await expect(run(handler)).resolves.toBe('pending')
    expect(cleanup).not.toHaveBeenCalled()

    handler.dispose()

    await vi.waitFor(() => {
      expect(cleanup).toHaveBeenCalledOnce()
    })
  })

  test('does not run the generator cleanup again when disposed of after the generator completes', async () => {
    const cleanup = vi.fn()
    const handler = new HttpHandler('GET', '/resource', function* () {
      try {
        yield HttpResponse.text('pending')
        return HttpResponse.text('complete')
      } finally {
        cleanup()
      }
    })

    await expect(run(handler)).resolves.toBe('pending')
    await expect(run(handler)).resolves.toBe('complete')
    expect(cleanup).toHaveBeenCalledOnce()

    handler.dispose()

    expect(cleanup).toHaveBeenCalledOnce()
  })

  test('reports a failing generator cleanup without throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => vi.restoreAllMocks())

    const cleanup = vi.fn(() => {
      throw new Error('Cleanup error')
    })

    const handler = new HttpHandler('GET', '/resource', function* () {
      try {
        yield HttpResponse.text('pending')
        return HttpResponse.text('complete')
      } finally {
        cleanup()
      }
    })

    await expect(run(handler)).resolves.toBe('pending')

    expect(() => handler.dispose()).not.toThrow()

    await expect
      .poll(() => console.error)
      .toHaveBeenCalledWith(
        expect.stringContaining(
          '[MSW] Failed to execute cleanup for request handler "GET /resource"',
        ),
      )
  })

  test('reports a failing async generator cleanup', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => vi.restoreAllMocks())

    const cleanup = vi.fn(() => {
      throw new Error('Cleanup error')
    })

    const handler = new HttpHandler('GET', '/resource', async function* () {
      try {
        yield HttpResponse.text('pending')
        return HttpResponse.text('complete')
      } finally {
        cleanup()
      }
    })

    await expect(run(handler)).resolves.toBe('pending')

    handler.dispose()

    await expect
      .poll(() => console.error)
      .toHaveBeenCalledWith(
        expect.stringContaining(
          '[MSW] Failed to execute cleanup for request handler "GET /resource"',
        ),
      )
  })
})
