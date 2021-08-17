import { EventEmitter } from 'stream'
import { pipeEvents } from './pipeEvents'

it('pipes events from the source emitter to the destination emitter', () => {
  const source = new EventEmitter()
  const destination = new EventEmitter()
  pipeEvents(source, destination)

  const callback = jest.fn()
  destination.on('hello', callback)

  source.emit('hello', 'world', { data: true })
  expect(callback).toHaveBeenNthCalledWith(1, 'world', { data: true })
})
