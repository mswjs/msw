import { NetworkFrame } from '#core/experimental/frames/network-frame'
import { NetworkSource } from './network-source'

it('emits the "frame" event when a frame is queued', async () => {
  class CustomNetworkSource extends NetworkSource {
    enable = async () => {}
  }

  class TestFrame extends NetworkFrame<any, any, any> {
    constructor() {
      super('test', {})
    }

    passthrough = vi.fn()
    errorWith = vi.fn()
    resolve = vi.fn()
    getUnhandledMessage = vi.fn()
  }

  const source = new CustomNetworkSource()
  const frameListener = vi.fn()
  source.on('frame', frameListener)

  const frame = source.queue(new TestFrame())
  await expect(frame).resolves.toBeUndefined()

  expect
    .soft(frameListener)
    .toHaveBeenCalledExactlyOnceWith(expect.objectContaining(frame))
})

it('removes all listeners when "disable" is called', async () => {
  class CustomNetworkSource extends NetworkSource {
    enable = async () => {}
  }

  class TestFrame extends NetworkFrame<any, any, any> {
    constructor() {
      super('test', {})
    }

    passthrough = vi.fn()
    errorWith = vi.fn()
    resolve = vi.fn()
    getUnhandledMessage = vi.fn()
  }

  const source = new CustomNetworkSource()
  const frameListener = vi.fn()
  source.on('frame', frameListener)

  await expect(source.disable()).resolves.toBeUndefined()
  await expect(source.queue(new TestFrame())).resolves.toBeUndefined()

  expect.soft(frameListener).not.toHaveBeenCalled()
})
