import { setTimeout } from 'node:timers/promises'
import { HttpHandler, HttpMethods } from '#http/http-handler'
import { NetworkSource } from './sources/network-source'
import { defineNetwork } from './define-network'

test('throws when enabling an already enabled network', () => {
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

test('returns a sync enable if all the sources are sync', () => {
  class SyncNetworkSource extends NetworkSource {
    enable = () => {}
  }
  const network = defineNetwork({
    sources: [new SyncNetworkSource()],
  })

  expect(network.enable()).toBeUndefined()
})

test('returns an async enable if any of the sources are async', () => {
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

test('returns an async enable if all the sources are async', () => {
  class AsyncNetworkSource extends NetworkSource {
    enable = async () => {}
  }

  const network = defineNetwork({
    sources: [new AsyncNetworkSource()],
  })

  expect(network.enable()).toBeInstanceOf(Promise)
})

test('throws when disabling an already disabled network', () => {
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

test('returns a sync disable if all the sources are sync', () => {
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

test('returns an async disable if any of the sources are async', async () => {
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

test('returns an async disable if all the sources are async', async () => {
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

test('awaits the pending generator cleanup', async () => {
  class SyncNetworkSource extends NetworkSource {
    enable = () => {}
    disable = () => {}
  }

  const cleanupGate = Promise.withResolvers<void>()
  const cleanupListener = vi.fn()

  const handler = new HttpHandler(
    HttpMethods.GET,
    'http://localhost/resource',
    async function* () {
      try {
        yield new Response('first')
        yield new Response('second')
      } finally {
        await cleanupGate.promise
        cleanupListener()
      }
    },
  )

  const network = defineNetwork({
    sources: [new SyncNetworkSource()],
    handlers: [handler],
  })

  network.enable()

  const result = await handler.run({
    request: new Request('http://localhost/resource'),
    requestId: 'request-1',
  })
  await expect(result?.response?.text()).resolves.toBe('first')

  const disableListener = vi.fn()
  const disablePromise = Promise.resolve(network.disable()).then(
    disableListener,
  )

  await setTimeout(50)
  expect(
    disableListener,
    'Disables while the generator cleanup is pending',
  ).not.toHaveBeenCalled()

  cleanupGate.resolve()
  await disablePromise

  expect(cleanupListener).toHaveBeenCalledOnce()
  expect(disableListener).toHaveBeenCalledOnce()
})

test('awaits the cleanup of a pending resolver', async () => {
  class SyncNetworkSource extends NetworkSource {
    enable = () => {}
    disable = () => {}
  }

  const resolverStarted = Promise.withResolvers<void>()
  const continueResolver = Promise.withResolvers<void>()
  const cleanupListener = vi.fn()

  const handler = new HttpHandler(
    HttpMethods.GET,
    'http://localhost/resource',
    async ({ finalize }) => {
      finalize(cleanupListener)
      resolverStarted.resolve()
      await continueResolver.promise

      return new Response(null, { status: 204 })
    },
  )

  const network = defineNetwork({
    sources: [new SyncNetworkSource()],
    handlers: [handler],
  })

  network.enable()

  const resultPromise = handler.run({
    request: new Request('http://localhost/resource'),
    requestId: 'request-1',
  })
  await resolverStarted.promise

  const disableListener = vi.fn()
  const disablePromise = Promise.resolve(network.disable()).then(
    disableListener,
  )

  await setTimeout(50)
  expect(
    cleanupListener,
    'Runs the cleanup while the resolver is pending',
  ).not.toHaveBeenCalled()
  expect(
    disableListener,
    'Disables while the resolver cleanup is pending',
  ).not.toHaveBeenCalled()

  continueResolver.resolve()
  await disablePromise

  expect(cleanupListener).toHaveBeenCalledOnce()

  const result = await resultPromise
  expect(result?.response?.status).toBe(204)
})

test('awaits the running cleanup of a completed resolver', async () => {
  class SyncNetworkSource extends NetworkSource {
    enable = () => {}
    disable = () => {}
  }

  const cleanupStarted = Promise.withResolvers<void>()
  const cleanupGate = Promise.withResolvers<void>()

  const handler = new HttpHandler(
    HttpMethods.GET,
    'http://localhost/resource',
    ({ finalize }) => {
      finalize(async () => {
        cleanupStarted.resolve()
        await cleanupGate.promise
      })

      return new Response(null, { status: 204 })
    },
  )

  const network = defineNetwork({
    sources: [new SyncNetworkSource()],
    handlers: [handler],
  })

  network.enable()

  const resultPromise = handler.run({
    request: new Request('http://localhost/resource'),
    requestId: 'request-1',
  })
  await cleanupStarted.promise

  const disableListener = vi.fn()
  const disablePromise = Promise.resolve(network.disable()).then(
    disableListener,
  )

  await setTimeout(50)
  expect(
    disableListener,
    'Disables while the resolver cleanup is running',
  ).not.toHaveBeenCalled()

  cleanupGate.resolve()
  await disablePromise

  const result = await resultPromise
  expect(result?.response?.status).toBe(204)
})

test('awaits the running cleanup of a generator closed by a reset', async () => {
  class SyncNetworkSource extends NetworkSource {
    enable = () => {}
    disable = () => {}
  }

  const cleanupStarted = Promise.withResolvers<void>()
  const cleanupGate = Promise.withResolvers<void>()

  const handler = new HttpHandler(
    HttpMethods.GET,
    'http://localhost/resource',
    function* ({ finalize }) {
      finalize(async () => {
        cleanupStarted.resolve()
        await cleanupGate.promise
      })

      yield new Response('first')
      return new Response('second')
    },
  )

  const network = defineNetwork({
    sources: [new SyncNetworkSource()],
    handlers: [handler],
  })

  network.enable()

  const result = await handler.run({
    request: new Request('http://localhost/resource'),
    requestId: 'request-1',
  })
  await expect(result?.response?.text()).resolves.toBe('first')

  network.resetHandlers()
  await cleanupStarted.promise

  const disableListener = vi.fn()
  const disablePromise = Promise.resolve(network.disable()).then(
    disableListener,
  )

  await setTimeout(50)
  expect(
    disableListener,
    'Disables while the generator cleanup is running',
  ).not.toHaveBeenCalled()

  cleanupGate.resolve()
  await disablePromise

  expect(disableListener).toHaveBeenCalledOnce()
})

test('stops awaiting a pending resolver once its request is aborted', async () => {
  class SyncNetworkSource extends NetworkSource {
    enable = () => {}
    disable = () => {}
  }

  const resolverStarted = Promise.withResolvers<void>()
  const neverSettled = Promise.withResolvers<void>()
  const cleanupListener = vi.fn()

  const handler = new HttpHandler(
    HttpMethods.GET,
    'http://localhost/resource',
    async ({ finalize }) => {
      finalize(cleanupListener)
      resolverStarted.resolve()
      await neverSettled.promise
    },
  )

  const network = defineNetwork({
    sources: [new SyncNetworkSource()],
    handlers: [handler],
  })

  network.enable()

  const requestController = new AbortController()
  void handler.run({
    request: new Request('http://localhost/resource', {
      signal: requestController.signal,
    }),
    requestId: 'request-1',
  })
  await resolverStarted.promise

  const disableListener = vi.fn()
  const disablePromise = Promise.resolve(network.disable()).then(
    disableListener,
  )

  await setTimeout(50)
  expect(
    disableListener,
    'Disables while the resolver is pending',
  ).not.toHaveBeenCalled()

  requestController.abort()
  await disablePromise

  expect(cleanupListener).toHaveBeenCalledOnce()
})

test('does not await a pending resolver of an aborted request', async () => {
  class SyncNetworkSource extends NetworkSource {
    enable = () => {}
    disable = () => {}
  }

  const resolverStarted = Promise.withResolvers<void>()
  const neverSettled = Promise.withResolvers<void>()
  const cleanupListener = vi.fn()

  const handler = new HttpHandler(
    HttpMethods.GET,
    'http://localhost/resource',
    async ({ finalize }) => {
      finalize(cleanupListener)
      resolverStarted.resolve()
      await neverSettled.promise
    },
  )

  const network = defineNetwork({
    sources: [new SyncNetworkSource()],
    handlers: [handler],
  })

  network.enable()

  const requestController = new AbortController()
  void handler.run({
    request: new Request('http://localhost/resource', {
      signal: requestController.signal,
    }),
    requestId: 'request-1',
  })
  await resolverStarted.promise

  requestController.abort()
  await expect.poll(() => cleanupListener).toHaveBeenCalledOnce()

  expect(network.disable()).toBeUndefined()
})

test('observes both the handler and the source disposal rejections', async () => {
  const unhandledRejectionListener = vi.fn()
  process.on('unhandledRejection', unhandledRejectionListener)
  onTestFinished(() => {
    process.off('unhandledRejection', unhandledRejectionListener)
  })

  class RejectingNetworkSource extends NetworkSource {
    enable = () => {}
    disable = () => Promise.reject(new Error('Source disposal error'))
  }

  const handler = new HttpHandler(HttpMethods.GET, '/resource', () => {})
  handler.dispose = () => Promise.reject(new Error('Handler disposal error'))

  const network = defineNetwork({
    sources: [new RejectingNetworkSource()],
    handlers: [handler],
  })

  network.enable()

  await expect(network.disable()).rejects.toThrow()

  await setTimeout(100)
  expect(
    unhandledRejectionListener,
    'Leaves a disposal rejection unobserved',
  ).not.toHaveBeenCalled()
})
