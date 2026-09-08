import { HttpHandler, HttpMethods } from '#http/http-handler'
import { NetworkSource } from './sources/network-source'
import { defineNetwork } from './define-network'
import { WebSocketHandler } from '../handlers/WebSocketHandler'
import { NetworkFrame } from './frames/network-frame'
import { HttpNetworkFrame } from './frames/http-frame'
import { attachSiblingHandlers } from '../utils/internal/attachSiblingHandlers'
import { graphql } from '../../graphql/graphql'
import { http } from '../../http/http'

class TestSource extends NetworkSource {
  enable = vi.fn<() => void | Promise<void>>()
  disable = vi.fn<() => void | Promise<void>>()
}

class TestFrame extends NetworkFrame<'test', undefined, {}> {
  constructor() {
    super('test', undefined)
  }

  getHandlers = () => []
  passthrough = vi.fn()
  errorWith = vi.fn()
  resolve = vi.fn()
  getUnhandledMessage = vi.fn()
}

class TestHttpFrame extends HttpNetworkFrame {
  passthrough = vi.fn()
  respondWith = vi.fn()
  errorWith = vi.fn()
}

it('reconciles handler updates made while restart waits for shutdown', async () => {
  const shutdown = Promise.withResolvers<void>()
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  source.disable.mockReturnValueOnce(shutdown.promise)
  const network = defineNetwork({ sources: [source] })
  network.enable()
  network.use(http.get('/resource', () => {}))
  const disabled = network.disable()
  const enabled = network.enable()
  network.resetHandlers()
  expect(source.enable).toHaveBeenCalledOnce()
  shutdown.resolve()
  await Promise.all([enabled, disabled])
  expect(source.enable).toHaveBeenCalledOnce()
  network.use(http.get('/next', () => {}))
  expect(source.enable).toHaveBeenCalledTimes(2)
  network.disable()
})

it('activates replacement kinds supplied through resetHandlers', () => {
  const httpSource = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const webSocketSource = new TestSource({
    lazy: { enabled: true, handlers: ['websocket'] },
  })
  const network = defineNetwork({
    sources: [httpSource, webSocketSource],
    handlers: [http.get('/resource', () => {})],
  })
  network.enable()

  network.resetHandlers(new WebSocketHandler('wss://example.com'))
  expect(httpSource.disable).toHaveBeenCalledOnce()
  expect(webSocketSource.enable).toHaveBeenCalledOnce()
  network.resetHandlers()
  expect(webSocketSource.disable).not.toHaveBeenCalled()
  expect(webSocketSource.enable).toHaveBeenCalledOnce()
  network.disable()
})

it('waits for the previous session to disable a reused source before enabling it', async () => {
  const shutdown = Promise.withResolvers<void>()
  const source = new TestSource()
  source.disable.mockReturnValueOnce(shutdown.promise)
  const network = defineNetwork({ sources: [source] })
  network.enable()
  const disabled = network.disable()
  const enabled = network.enable()
  expect(source.enable).toHaveBeenCalledOnce()

  shutdown.resolve()
  await Promise.all([disabled, enabled])
  expect(source.enable).toHaveBeenCalledTimes(2)
  await network.disable()
})

it('does not activate a restarted session stopped while previous shutdown is pending', async () => {
  const shutdown = Promise.withResolvers<void>()
  const source = new TestSource()
  source.disable.mockReturnValueOnce(shutdown.promise)
  const network = defineNetwork({ sources: [source] })
  network.enable()
  const firstDisposal = network.disable()
  const restarted = network.enable()
  const secondDisposal = network.disable()
  shutdown.resolve()

  await Promise.all([firstDisposal, restarted, secondDisposal])
  expect(source.enable).toHaveBeenCalledOnce()
  expect(source.disable).toHaveBeenCalledOnce()
})

it('activates initial handler kinds and their nested siblings', () => {
  const httpSource = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const webSocketSource = new TestSource({
    lazy: { enabled: true, handlers: ['websocket'] },
  })
  const upgrade = http.get('/upgrade', () => {})
  const transport = attachSiblingHandlers(
    new WebSocketHandler('wss://example.com'),
    [upgrade],
  )
  const handler = attachSiblingHandlers(
    http.get('/resource', () => {}),
    [transport],
  )
  const network = defineNetwork({
    sources: [httpSource, webSocketSource],
    handlers: [handler],
  })

  network.enable()
  expect(httpSource.enable).toHaveBeenCalledOnce()
  expect(webSocketSource.enable).toHaveBeenCalledOnce()
  expect(network.listHandlers()).toEqual([handler])
  network.disable()
})

it('keeps WebSocket sources disabled for GraphQL query-only handlers', () => {
  const httpSource = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const webSocketSource = new TestSource({
    lazy: { enabled: true, handlers: ['websocket'] },
  })
  const api = graphql.link('https://example.com/graphql')
  const network = defineNetwork({
    sources: [httpSource, webSocketSource],
    handlers: [api.query('GetUser', () => {})],
  })

  network.enable()
  expect(httpSource.enable).toHaveBeenCalledOnce()
  expect(webSocketSource.enable).not.toHaveBeenCalled()
  network.use(api.operation(() => {}))
  expect(webSocketSource.enable).toHaveBeenCalledOnce()
  network.resetHandlers()
  expect(webSocketSource.disable).toHaveBeenCalledOnce()
  network.disable()
})

it('activates subscription transport and upgrade sources for GraphQL subscriptions', () => {
  const httpSource = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const webSocketSource = new TestSource({
    lazy: { enabled: true, handlers: ['websocket'] },
  })
  const network = defineNetwork({
    sources: [httpSource, webSocketSource],
    handlers: [
      graphql
        .link('https://example.com/graphql')
        .subscription('Updates', () => {}),
    ],
  })

  network.enable()
  expect(httpSource.enable).toHaveBeenCalledOnce()
  expect(webSocketSource.enable).toHaveBeenCalledOnce()
  network.disable()
})

it('retains frame routing after removing and re-adding a handler kind', async () => {
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const resolver = vi.fn(() => new Response('mocked'))
  const handler = http.get('https://example.com/resource', resolver)
  const network = defineNetwork({ sources: [source], context: { quiet: true } })
  const onRequest = vi.fn()
  network.events.on('request:start', onRequest)

  network.enable()
  network.use(handler)
  const firstFrame = new TestHttpFrame({
    request: new Request('https://example.com/resource'),
  })
  await source.queue(firstFrame)
  expect(firstFrame.respondWith).toHaveBeenCalledOnce()

  network.resetHandlers()
  expect(source.disable).toHaveBeenCalledOnce()
  network.use(handler)
  const nextFrame = new TestHttpFrame({
    request: new Request('https://example.com/resource'),
  })
  await source.queue(nextFrame)
  expect(nextFrame.respondWith).toHaveBeenCalledOnce()
  expect(resolver).toHaveBeenCalledTimes(2)
  expect(onRequest).toHaveBeenCalledTimes(2)
  expect(source.enable).toHaveBeenCalledTimes(2)
  network.disable()
})

it('uses the latest handlers after pending activation settles', async () => {
  const activation = Promise.withResolvers<void>()
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  source.enable.mockReturnValue(activation.promise)
  const previousResolver = vi.fn(() => new Response('previous'))
  const latestResolver = vi.fn(() => new Response('latest'))
  const network = defineNetwork({ sources: [source], context: { quiet: true } })
  network.enable()
  network.use(http.get('https://example.com/resource', previousResolver))
  const frame = new TestHttpFrame({
    request: new Request('https://example.com/resource'),
  })
  const queued = source.queue(frame)
  network.resetHandlers(
    http.get('https://example.com/resource', latestResolver),
  )
  activation.resolve()

  await queued
  expect(previousResolver).not.toHaveBeenCalled()
  expect(latestResolver).toHaveBeenCalledOnce()
  expect(frame.respondWith).toHaveBeenCalledOnce()
  network.disable()
})

it('keeps sources enabled when one-time handlers are exhausted and restored', async () => {
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const resolver = vi.fn(() => new Response('mocked'))
  const network = defineNetwork({
    sources: [source],
    handlers: [
      http.get('https://example.com/resource', resolver, { once: true }),
    ],
    context: { quiet: true },
    onUnhandledFrame: 'bypass',
  })
  network.enable()

  await source.queue(
    new TestHttpFrame({ request: new Request('https://example.com/resource') }),
  )
  const unhandledFrame = new TestHttpFrame({
    request: new Request('https://example.com/resource'),
  })
  await source.queue(unhandledFrame)
  expect(unhandledFrame.passthrough).toHaveBeenCalledOnce()

  network.restoreHandlers()
  await source.queue(
    new TestHttpFrame({ request: new Request('https://example.com/resource') }),
  )
  expect(resolver).toHaveBeenCalledTimes(2)
  expect(source.enable).toHaveBeenCalledOnce()
  expect(source.disable).not.toHaveBeenCalled()
  network.disable()
})

it('rejects startup when a required source fails to enable', async () => {
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const error = new Error('Activation failed')
  source.enable.mockRejectedValue(error)
  const network = defineNetwork({
    sources: [source],
    handlers: [http.get('/resource', () => {})],
  })

  await expect(network.enable()).rejects.toMatchObject({ errors: [error] })
  await network.disable()
})

it('rejects queued frames after runtime activation fails and allows retry', async () => {
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const error = new Error('Activation failed')
  source.enable.mockRejectedValueOnce(error)
  const network = defineNetwork({ sources: [source] })
  network.enable()
  network.use(http.get('/resource', () => {}))
  const failedFrame = new TestFrame()

  await expect(source.queue(failedFrame)).rejects.toMatchObject({
    errors: [error],
  })
  expect(failedFrame.resolve).not.toHaveBeenCalled()

  network.use()
  const nextFrame = new TestFrame()
  await source.queue(nextFrame)
  expect(nextFrame.resolve).toHaveBeenCalledOnce()
  expect(source.enable).toHaveBeenCalledTimes(2)
  network.disable()
})

it('passes through queued frames when stopped before activation completes', async () => {
  const activation = Promise.withResolvers<void>()
  const source = new TestSource()
  source.enable.mockReturnValue(activation.promise)
  const network = defineNetwork({ sources: [source] })
  const enabled = network.enable()
  const frame = new TestFrame()
  const queued = source.queue(frame)
  const disabled = network.disable()
  activation.resolve()

  await Promise.all([enabled, disabled, queued])
  expect(frame.resolve).not.toHaveBeenCalled()
  expect(frame.passthrough).toHaveBeenCalledOnce()
  expect(source.disable).toHaveBeenCalledOnce()
})

it('uses reconfigured sources when enabled again', async () => {
  class TestSource extends NetworkSource {
    enable = vi.fn()
    disable = vi.fn(async () => {})
  }

  const initialSource = new TestSource()
  const nextSource = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const network = defineNetwork({ sources: [initialSource] })

  network.enable()
  await network.disable()

  network.configure({ sources: [nextSource] })
  network.enable()
  expect(nextSource.enable).not.toHaveBeenCalled()

  network.use(new HttpHandler(HttpMethods.GET, '/resource', () => {}))
  expect(nextSource.enable).toHaveBeenCalledOnce()
  expect(initialSource.enable).toHaveBeenCalledOnce()

  await network.disable()
  expect(nextSource.disable).toHaveBeenCalledOnce()
  expect(initialSource.disable).toHaveBeenCalledOnce()
})

it('updates lazy sources as handler kinds are added and removed', () => {
  class TestSource extends NetworkSource {
    enable = vi.fn()
    disable = vi.fn()
  }

  const httpSource = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const webSocketSource = new TestSource({
    lazy: { enabled: true, handlers: ['websocket'] },
  })
  const httpHandler = new HttpHandler(HttpMethods.GET, '/resource', () => {})
  const webSocketHandler = new WebSocketHandler('wss://example.com')
  const network = defineNetwork({ sources: [httpSource, webSocketSource] })

  network.use(httpHandler)
  expect(httpSource.enable).not.toHaveBeenCalled()

  network.enable()
  expect(httpSource.enable).toHaveBeenCalledOnce()
  expect(webSocketSource.enable).not.toHaveBeenCalled()

  network.use(webSocketHandler)
  expect(webSocketSource.enable).toHaveBeenCalledOnce()
  expect(httpSource.enable).toHaveBeenCalledOnce()

  network.resetHandlers(httpHandler)
  expect(webSocketSource.disable).toHaveBeenCalledOnce()
  expect(httpSource.disable).not.toHaveBeenCalled()

  network.disable()
  expect(httpSource.disable).toHaveBeenCalledOnce()
  expect(webSocketSource.disable).toHaveBeenCalledOnce()

  network.use(webSocketHandler)
  expect(webSocketSource.enable).toHaveBeenCalledOnce()

  network.enable()
  expect(webSocketSource.enable).toHaveBeenCalledTimes(2)
  network.disable()
})

describe('enable()', () => {
  it('throws if called on already enabled network', () => {
    class SyncNetworkSource extends NetworkSource {
      enable = () => {}
    }
    const network = defineNetwork({
      sources: [new SyncNetworkSource()],
    })

    expect(network.enable()).toBeUndefined()
    expect(() => network.enable()).toThrow(
      'Failed to call "enable" on the network: already enabled',
    )

    network.disable()
    expect(network.enable()).toBeUndefined()
  })

  it('returns a sync enable if all the sources are sync', () => {
    class SyncNetworkSource extends NetworkSource {
      enable = () => {}
    }
    const network = defineNetwork({
      sources: [new SyncNetworkSource()],
    })

    expect(network.enable()).toBeUndefined()
  })

  it('returns an async enable if any of the sources are async', () => {
    class SyncNetworkSource extends NetworkSource {
      enable = () => {}
    }
    class AsyncNetworkSource extends NetworkSource {
      enable = async () => {}
    }

    const network = defineNetwork({
      sources: [new SyncNetworkSource(), new AsyncNetworkSource()],
    })

    expect(network.enable()).toBeInstanceOf(Promise)
  })

  it('returns an async enable if all the sources are async', () => {
    class AsyncNetworkSource extends NetworkSource {
      enable = async () => {}
    }

    const network = defineNetwork({
      sources: [new AsyncNetworkSource()],
    })

    expect(network.enable()).toBeInstanceOf(Promise)
  })
})

describe('disable()', () => {
  it('throws if called on already enabled network', () => {
    class SyncNetworkSource extends NetworkSource {
      enable = () => {}
    }
    const network = defineNetwork({
      sources: [new SyncNetworkSource()],
    })

    network.enable()
    expect(network.disable()).toBeUndefined()
    expect(() => network.disable()).toThrow(
      'Failed to call "disable" on the network: already disabled',
    )

    network.enable()
    expect(network.disable()).toBeUndefined()
  })

  it('returns a sync disable if all the sources are sync', () => {
    class SyncNetworkSource extends NetworkSource {
      enable = () => {}
      disable = () => {}
    }
    const network = defineNetwork({
      sources: [new SyncNetworkSource()],
    })

    network.enable()
    expect(network.disable()).toBeUndefined()
  })

  it('returns an async disable if any of the sources are async', async () => {
    class SyncNetworkSource extends NetworkSource {
      enable = () => {}
      disable = () => {}
    }
    class AsyncNetworkSource extends NetworkSource {
      enable = async () => {}
      disable = async () => {}
    }

    const network = defineNetwork({
      sources: [new SyncNetworkSource(), new AsyncNetworkSource()],
    })

    await network.enable()
    expect(network.disable()).toBeInstanceOf(Promise)
  })

  it('returns an async disable if all the sources are async', async () => {
    class AsyncNetworkSource extends NetworkSource {
      enable = async () => {}
      disable = async () => {}
    }

    const network = defineNetwork({
      sources: [new AsyncNetworkSource()],
    })

    await network.enable()
    expect(network.disable()).toBeInstanceOf(Promise)
  })

  it('observes both the handler and the source disposal rejections', async () => {
    const unhandledRejectionListener = vi.fn()
    process.on('unhandledRejection', unhandledRejectionListener)

    try {
      class RejectingNetworkSource extends NetworkSource {
        enable = () => {}
        disable = () => Promise.reject(new Error('Source disposal error'))
      }

      const handler = new HttpHandler(HttpMethods.GET, '/resource', () => {})
      handler.dispose = () =>
        Promise.reject(new Error('Handler disposal error'))

      const network = defineNetwork({
        sources: [new RejectingNetworkSource()],
        handlers: [handler],
      })

      network.enable()

      await expect(network.disable()).rejects.toThrow()

      // Give an unobserved rejection a chance to surface.
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(unhandledRejectionListener).not.toHaveBeenCalled()
    } finally {
      // Detach the listener whether the assertions above pass or not,
      // so a failure here cannot leak it into the rest of the run.
      process.off('unhandledRejection', unhandledRejectionListener)
    }
  })
})

it('stops routing frames while network shutdown is pending', async () => {
  const shutdown = Promise.withResolvers<void>()

  class CustomNetworkSource extends NetworkSource {
    enable = () => {}
    disable = () => {
      return shutdown.promise
    }
  }

  const source = new CustomNetworkSource()
  const network = defineNetwork({ sources: [source] })
  network.enable()

  const frame = new TestFrame()
  await source.queue(frame)
  expect(frame.resolve).toHaveBeenCalledOnce()
  frame.resolve.mockClear()

  const disposal = network.disable()
  await source.queue(frame)
  expect(frame.resolve).not.toHaveBeenCalled()

  shutdown.resolve()
  await expect(disposal).resolves.toBeUndefined()

  network.enable()
  await source.queue(frame)
  expect(frame.resolve).toHaveBeenCalledOnce()

  await network.disable()
})

it('waits for newly required sources before resolving queued frames', async () => {
  const activation = Promise.withResolvers<void>()

  class EagerSource extends NetworkSource {
    enable = () => {}
  }

  class LazySource extends NetworkSource {
    enable = () => {
      return activation.promise
    }
  }

  const eagerSource = new EagerSource()
  const lazySource = new LazySource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const network = defineNetwork({ sources: [eagerSource, lazySource] })
  network.enable()
  network.use(new HttpHandler(HttpMethods.GET, '/resource', () => {}))

  const frame = new TestFrame()
  const queuedFrame = eagerSource.queue(frame)
  await Promise.resolve()
  expect(frame.resolve).not.toHaveBeenCalled()

  activation.resolve()
  await queuedFrame
  expect(frame.resolve).toHaveBeenCalledOnce()
  network.disable()
})

it('waits for activation when a source queues a frame inside enable', async () => {
  const activation = Promise.withResolvers<void>()
  const frame = new TestFrame()

  class CustomSource extends NetworkSource {
    public queuedFrame?: Promise<void>

    enable = () => {
      this.queuedFrame = this.queue(frame)
      return activation.promise
    }
  }

  const source = new CustomSource()
  const network = defineNetwork({ sources: [source] })
  const enabled = network.enable()

  await Promise.resolve()
  await Promise.resolve()
  expect(frame.resolve).not.toHaveBeenCalled()

  activation.resolve()
  await enabled
  await source.queuedFrame
  expect(frame.resolve).toHaveBeenCalledOnce()
  network.disable()
})
