import { NetworkSource } from './sources/network-source'
import { NetworkSourceRegistry } from './network-source-registry'

class TestSource extends NetworkSource {
  enable = vi.fn<() => void | Promise<void>>()
  disable = vi.fn<() => void | Promise<void>>()
}

it('serializes source disposal and activation across registries', async () => {
  const shutdown = Promise.withResolvers<void>()
  const source = new TestSource()
  source.disable.mockReturnValueOnce(shutdown.promise)
  const previous = new NetworkSourceRegistry([source])
  previous.accept([])
  const disposed = previous.dispose()

  const next = new NetworkSourceRegistry([source])
  const activated = next.accept([])
  expect(source.enable).toHaveBeenCalledOnce()
  shutdown.resolve()
  await Promise.all([disposed, activated])
  expect(source.enable).toHaveBeenCalledTimes(2)
  next.dispose()
})

it('cancels a new registry demand while previous disposal is pending', async () => {
  const shutdown = Promise.withResolvers<void>()
  const source = new TestSource()
  source.disable.mockReturnValueOnce(shutdown.promise)
  const previous = new NetworkSourceRegistry([source])
  previous.accept([])
  previous.dispose()

  const next = new NetworkSourceRegistry([source])
  next.accept([])
  next.dispose()
  shutdown.resolve()
  await Promise.all([previous.idle, next.idle])
  expect(source.enable).toHaveBeenCalledOnce()
  expect(source.disable).toHaveBeenCalledOnce()
})

it('keeps a shared source enabled until every registry releases it', () => {
  const source = new TestSource()
  const first = new NetworkSourceRegistry([source])
  const second = new NetworkSourceRegistry([source])

  first.accept([])
  second.accept([])
  expect(source.enable).toHaveBeenCalledOnce()
  first.dispose()
  expect(source.disable).not.toHaveBeenCalled()
  second.dispose()
  expect(source.disable).toHaveBeenCalledOnce()
})

it('enables unrelated sources without waiting for another registry disposal', async () => {
  const shutdown = Promise.withResolvers<void>()
  const previousSource = new TestSource()
  previousSource.disable.mockReturnValue(shutdown.promise)
  const previous = new NetworkSourceRegistry([previousSource])
  previous.accept([])
  previous.dispose()

  const nextSource = new TestSource()
  const next = new NetworkSourceRegistry([nextSource])
  expect(next.accept([])).toBeUndefined()
  await expect(next.idle).resolves.toBeUndefined()
  expect(nextSource.enable).toHaveBeenCalledOnce()
  shutdown.resolve()
  await previous.idle
  next.dispose()
})

it('stays idle without sources', async () => {
  const registry = new NetworkSourceRegistry([])
  expect(registry.accept(['request'])).toBeUndefined()
  await expect(registry.idle).resolves.toBeUndefined()
  expect(registry.dispose()).toBeUndefined()
})

it('keeps lazy sources with no target kinds disabled', async () => {
  const source = new TestSource({ lazy: { enabled: true, handlers: [] } })
  const registry = new NetworkSourceRegistry([source])
  registry.accept(['request', 'websocket'])
  registry.dispose()
  await expect(registry.idle).resolves.toBeUndefined()
  expect(source.enable).not.toHaveBeenCalled()
  expect(source.disable).not.toHaveBeenCalled()
})

it('treats each handler kind list as exhaustive across independent sources', () => {
  const httpSource = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  const webSocketSource = new TestSource({
    lazy: { enabled: true, handlers: ['websocket'] },
  })
  const eagerSource = new TestSource()
  const registry = new NetworkSourceRegistry([
    httpSource,
    webSocketSource,
    eagerSource,
  ])

  registry.accept(['request'])
  expect(webSocketSource.enable).not.toHaveBeenCalled()
  registry.accept(['websocket'])
  expect(httpSource.disable).toHaveBeenCalledOnce()
  expect(webSocketSource.enable).toHaveBeenCalledOnce()
  expect(eagerSource.enable).toHaveBeenCalledOnce()
  expect(eagerSource.disable).not.toHaveBeenCalled()
  registry.accept([])
  expect(webSocketSource.disable).toHaveBeenCalledOnce()
  registry.dispose()
  registry.dispose()
  expect(eagerSource.disable).toHaveBeenCalledOnce()
})

it('retries failed asynchronous disposal without re-enabling the source', async () => {
  const source = new TestSource()
  const error = new Error('Disposal failed')
  source.disable.mockRejectedValueOnce(error)
  const registry = new NetworkSourceRegistry([source])
  registry.accept([])

  await expect(registry.dispose()).rejects.toMatchObject({ errors: [error] })
  await expect(registry.idle).rejects.toMatchObject({ errors: [error] })
  registry.dispose()
  await expect(registry.idle).resolves.toBeUndefined()
  expect(source.disable).toHaveBeenCalledTimes(2)
  expect(source.enable).toHaveBeenCalledOnce()
})

it('waits for every pending disposal before settling idle', async () => {
  const firstDisposal = Promise.withResolvers<void>()
  const secondDisposal = Promise.withResolvers<void>()
  const firstSource = new TestSource()
  const secondSource = new TestSource()
  firstSource.disable.mockReturnValue(firstDisposal.promise)
  secondSource.disable.mockReturnValue(secondDisposal.promise)
  const registry = new NetworkSourceRegistry([firstSource, secondSource])
  registry.accept([])
  const disposal = registry.dispose()
  const onIdle = vi.fn()
  const idle = registry.idle.then(onIdle)

  firstDisposal.resolve()
  await firstDisposal.promise
  expect(onIdle).not.toHaveBeenCalled()
  secondDisposal.resolve()
  await Promise.all([disposal, idle])
  expect(onIdle).toHaveBeenCalledOnce()
})

it('enables eager sources without handlers', async () => {
  const source = new TestSource()
  const registry = new NetworkSourceRegistry([source])

  expect(registry.accept([])).toBeUndefined()
  expect(source.enable).toHaveBeenCalledOnce()
  await expect(registry.idle).resolves.toBeUndefined()

  registry.accept(['request'])
  expect(source.enable).toHaveBeenCalledOnce()
  expect(registry.dispose()).toBeUndefined()
  expect(source.disable).toHaveBeenCalledOnce()
})

it('activates lazy sources only for matching handler kinds', async () => {
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request', 'websocket'] },
  })
  const registry = new NetworkSourceRegistry([source, source])

  registry.accept([])
  expect(source.enable).not.toHaveBeenCalled()

  registry.accept(['request'])
  registry.accept(['websocket'])
  expect(source.enable).toHaveBeenCalledOnce()
  expect(source.disable).not.toHaveBeenCalled()

  registry.accept([])
  expect(source.disable).toHaveBeenCalledOnce()
  await expect(registry.idle).resolves.toBeUndefined()
})

it('treats disabled lazy configuration as eager', () => {
  const source = new TestSource({
    lazy: { enabled: false, handlers: ['request'] },
  })
  const registry = new NetworkSourceRegistry([source])

  registry.accept([])
  expect(source.enable).toHaveBeenCalledOnce()
})

it('waits for every source to finish enabling', async () => {
  const firstEnable = Promise.withResolvers<void>()
  const secondEnable = Promise.withResolvers<void>()
  const firstSource = new TestSource()
  const secondSource = new TestSource()
  firstSource.enable.mockReturnValue(firstEnable.promise)
  secondSource.enable.mockReturnValue(secondEnable.promise)
  const registry = new NetworkSourceRegistry([firstSource, secondSource])
  const onIdle = vi.fn()

  registry.accept([])
  const idle = registry.idle.then(onIdle)
  expect(firstSource.enable).toHaveBeenCalledOnce()
  expect(secondSource.enable).toHaveBeenCalledOnce()

  firstEnable.resolve()
  await firstEnable.promise
  expect(onIdle).not.toHaveBeenCalled()

  secondEnable.resolve()
  await idle
  expect(onIdle).toHaveBeenCalledOnce()
})

it('finishes enabling before disabling a source no longer needed', async () => {
  const enable = Promise.withResolvers<void>()
  const disable = Promise.withResolvers<void>()
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  source.enable.mockReturnValue(enable.promise)
  source.disable.mockReturnValue(disable.promise)
  const registry = new NetworkSourceRegistry([source])
  const onIdle = vi.fn()

  registry.accept(['request'])
  const idle = registry.idle.then(onIdle)
  registry.accept([])
  expect(source.disable).not.toHaveBeenCalled()

  enable.resolve()
  await enable.promise
  expect(source.disable).toHaveBeenCalledOnce()
  expect(onIdle).not.toHaveBeenCalled()

  disable.resolve()
  await idle
  expect(onIdle).toHaveBeenCalledOnce()
})

it('re-enables a source requested while disabling', async () => {
  const disable = Promise.withResolvers<void>()
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  source.disable.mockReturnValue(disable.promise)
  const registry = new NetworkSourceRegistry([source])

  registry.accept(['request'])
  registry.accept([])
  registry.accept(['request'])
  expect(source.enable).toHaveBeenCalledOnce()

  disable.resolve()
  await expect(registry.idle).resolves.toBeUndefined()
  expect(source.enable).toHaveBeenCalledTimes(2)
})

it('uses the latest demand while enabling', async () => {
  const enable = Promise.withResolvers<void>()
  const source = new TestSource({
    lazy: { enabled: true, handlers: ['request'] },
  })
  source.enable.mockReturnValue(enable.promise)
  const registry = new NetworkSourceRegistry([source])

  registry.accept(['request'])
  registry.accept([])
  registry.accept(['request'])
  enable.resolve()

  await expect(registry.idle).resolves.toBeUndefined()
  expect(source.enable).toHaveBeenCalledOnce()
  expect(source.disable).not.toHaveBeenCalled()
})

it('waits for pending sources before reporting a transition failure', async () => {
  const enable = Promise.withResolvers<void>()
  const failingSource = new TestSource()
  const pendingSource = new TestSource()
  const error = new Error('Cannot enable source')
  failingSource.enable.mockRejectedValue(error)
  pendingSource.enable.mockReturnValue(enable.promise)
  const registry = new NetworkSourceRegistry([failingSource, pendingSource])
  const onFailure = vi.fn()

  registry.accept([])
  const idle = registry.idle.catch(onFailure)
  await Promise.resolve()
  expect(onFailure).not.toHaveBeenCalled()

  enable.resolve()
  await idle
  expect(onFailure).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ errors: [error] }),
  )

  failingSource.enable.mockReturnValue(undefined)
  registry.accept([])
  await expect(registry.idle).resolves.toBeUndefined()
  expect(failingSource.enable).toHaveBeenCalledTimes(2)
})

it('disables a source that finishes enabling during shutdown', async () => {
  const enable = Promise.withResolvers<void>()
  const source = new TestSource()
  source.enable.mockReturnValue(enable.promise)
  const registry = new NetworkSourceRegistry([source])

  registry.accept([])
  const disposal = registry.dispose()
  expect(source.disable).not.toHaveBeenCalled()

  enable.resolve()
  await expect(disposal).resolves.toBeUndefined()
  expect(source.disable).toHaveBeenCalledOnce()
})

it('continues updating other sources after a synchronous failure', async () => {
  const failingSource = new TestSource()
  const otherSource = new TestSource()
  const error = new Error('Cannot enable source')
  failingSource.enable.mockImplementation(() => {
    throw error
  })
  const registry = new NetworkSourceRegistry([failingSource, otherSource])

  registry.accept([])
  expect(otherSource.enable).toHaveBeenCalledOnce()
  await expect(registry.idle).rejects.toMatchObject({ errors: [error] })
})
