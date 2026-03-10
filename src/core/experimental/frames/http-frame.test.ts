import { http } from '../../http'
import { bypass } from '../../bypass'
import { HttpNetworkFrame, HttpNetworkFrameEventMap } from './http-frame'

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  vi.restoreAllMocks()
})

function spyOnNetworkFrame(frame: HttpNetworkFrame) {
  const events: Array<
    HttpNetworkFrameEventMap[keyof HttpNetworkFrameEventMap]
  > = []

  frame.events.on('*', (event) => events.push(event))

  return {
    events,
  }
}

it('resolves a matching request', async () => {
  class HttpFrame extends HttpNetworkFrame {
    respondWith = vi.fn()
    passthrough = vi.fn()
    errorWith = vi.fn()
  }

  const frame = new HttpFrame({
    request: new Request('http://localhost/api'),
  })
  const { events } = spyOnNetworkFrame(frame)
  const unhandledFrameCallback = vi.fn()

  const matches = await frame.resolve(
    [
      http.get('http://localhost/api', () => {
        return new Response(null, { status: 204 })
      }),
    ],
    unhandledFrameCallback,
    { quiet: true },
  )

  expect.soft(matches).toBe(true)
  expect.soft(frame.respondWith).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      status: 204,
    }),
  )
  expect.soft(frame.passthrough).not.toHaveBeenCalled()
  expect.soft(frame.errorWith).not.toHaveBeenCalled()
  expect.soft(unhandledFrameCallback).not.toHaveBeenCalled()
  expect.soft(events).toEqual([
    expect.objectContaining({
      type: 'request:start',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
    expect.objectContaining({
      type: 'request:match',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
    expect.objectContaining({
      type: 'request:end',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
  ])
})

it('resolves a non-matching request', async () => {
  class HttpFrame extends HttpNetworkFrame {
    respondWith = vi.fn()
    passthrough = vi.fn()
    errorWith = vi.fn()
  }

  const frame = new HttpFrame({
    request: new Request('http://localhost/api'),
  })
  const { events } = spyOnNetworkFrame(frame)
  const unhandledFrameCallback = vi.fn()

  const matches = await frame.resolve(
    [
      http.get('http://example.com/resource', () => {
        return new Response(null, { status: 204 })
      }),
    ],
    unhandledFrameCallback,
    { quiet: true },
  )

  expect.soft(matches).toBe(false)
  expect.soft(frame.passthrough).toHaveBeenCalledOnce()
  expect.soft(frame.respondWith).not.toHaveBeenCalled()
  expect.soft(frame.errorWith).not.toHaveBeenCalled()
  expect.soft(unhandledFrameCallback).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      frame,
    }),
  )
  expect.soft(events).toEqual([
    expect.objectContaining({
      type: 'request:start',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
    expect.objectContaining({
      type: 'request:unhandled',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
    expect.objectContaining({
      type: 'request:end',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
  ])
})

it('resolves a bypassed request', async () => {
  class HttpFrame extends HttpNetworkFrame {
    respondWith = vi.fn()
    passthrough = vi.fn()
    errorWith = vi.fn()
  }

  const frame = new HttpFrame({
    request: bypass(new Request('http://localhost/api')),
  })
  const { events } = spyOnNetworkFrame(frame)
  const unhandledFrameCallback = vi.fn()

  const matches = await frame.resolve(
    [
      http.get('http://localhost/api', () => {
        return new Response(null, { status: 204 })
      }),
    ],
    unhandledFrameCallback,
    { quiet: true },
  )

  expect.soft(matches).toBeNull()
  expect.soft(frame.passthrough).toHaveBeenCalledOnce()
  expect.soft(frame.respondWith).not.toHaveBeenCalled()
  expect.soft(frame.errorWith).not.toHaveBeenCalled()
  expect.soft(unhandledFrameCallback).not.toHaveBeenCalled()
  expect.soft(events).toEqual([
    expect.objectContaining({
      type: 'request:start',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
    expect.objectContaining({
      type: 'request:end',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
  ])
})

it('errors the request on unhandled exception', async () => {
  class HttpFrame extends HttpNetworkFrame {
    respondWith = vi.fn()
    passthrough = vi.fn()
    errorWith = vi.fn()
  }

  const frame = new HttpFrame({
    request: new Request('http://localhost/api'),
  })
  const { events } = spyOnNetworkFrame(frame)
  const unhandledFrameCallback = vi.fn()

  const exception = new Error('Unhandled exception')
  const matches = await frame.resolve(
    [
      http.get('http://localhost/api', () => {
        throw exception
      }),
    ],
    unhandledFrameCallback,
    { quiet: true },
  )

  expect.soft(matches).toBeNull()
  expect.soft(frame.errorWith).toHaveBeenCalledExactlyOnceWith(exception)
  expect.soft(frame.passthrough).not.toHaveBeenCalled()
  expect.soft(frame.respondWith).not.toHaveBeenCalled()
  expect.soft(unhandledFrameCallback).not.toHaveBeenCalled()
  expect.soft(events).toEqual([
    expect.objectContaining({
      type: 'request:start',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
    expect.objectContaining({
      type: 'unhandledException',
      error: exception,
      requestId: frame.data.id,
      request: frame.data.request,
    }),
  ])

  expect.soft(console.error).toHaveBeenCalledTimes(2)
  expect.soft(console.error).toHaveBeenNthCalledWith(1, exception)
  expect
    .soft(console.error)
    .toHaveBeenNthCalledWith(
      2,
      '[MSW] Encountered an unhandled exception during the handler lookup for "GET http://localhost/api". Please see the original error above.',
    )
})

it('does not print an unhandled exception if the "unhandledException" listener is present', async () => {
  class HttpFrame extends HttpNetworkFrame {
    respondWith = vi.fn()
    passthrough = vi.fn()
    errorWith = vi.fn()
  }

  const frame = new HttpFrame({
    request: new Request('http://localhost/api'),
  })
  const { events } = spyOnNetworkFrame(frame)
  const unhandledFrameCallback = vi.fn()

  const unhandledExceptionListener = vi.fn()
  frame.events.on('unhandledException', unhandledExceptionListener)

  const exception = new Error('Unhandled exception')
  const matches = await frame.resolve(
    [
      http.get('http://localhost/api', () => {
        throw exception
      }),
    ],
    unhandledFrameCallback,
    { quiet: true },
  )

  expect.soft(matches).toBeNull()
  expect.soft(frame.errorWith).toHaveBeenCalledExactlyOnceWith(exception)
  expect.soft(frame.passthrough).not.toHaveBeenCalled()
  expect.soft(frame.respondWith).not.toHaveBeenCalled()
  expect.soft(unhandledFrameCallback).not.toHaveBeenCalled()
  expect.soft(events).toEqual([
    expect.objectContaining({
      type: 'request:start',
      requestId: frame.data.id,
      request: frame.data.request,
    }),
    expect.objectContaining({
      type: 'unhandledException',
      error: exception,
      requestId: frame.data.id,
      request: frame.data.request,
    }),
  ])

  expect.soft(console.error).not.toHaveBeenCalled()
  expect.soft(unhandledExceptionListener).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      error: exception,
      requestId: frame.data.id,
      request: frame.data.request,
    }),
  )
})
