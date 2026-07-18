import { HttpHandler, HttpMethods } from '../handlers/HttpHandler'
import { NetworkSource } from './sources/network-source'
import { defineNetwork } from './define-network'

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
