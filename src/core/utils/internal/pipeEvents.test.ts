import { Emitter, TypedEvent } from 'rettime'
import { pipeEvents } from './pipeEvents'

it('pipes events from the source emitter to the destination emitter', () => {
  const source = new Emitter()
  const destination = new Emitter()
  pipeEvents(source, destination)

  const callback = vi.fn()
  destination.on('hello', callback)

  const event = new TypedEvent('hello', { data: 'world' })
  source.emit(event)
  expect(callback).toHaveBeenNthCalledWith(1, event)
})
