import { type Socket } from 'socket.io-client'
import { type StreamEventMap } from './events'

/**
 * Transfers the `ReadableStream` over the given socket.
 */
export async function emitReadableStream(
  stream: ReadableStream,
  socket: Socket<any, StreamEventMap>,
): Promise<void> {
  const reader = stream.getReader()

  try {
    while (true) {
      const { value, done } = await reader.read()

      if (done) {
        socket.emit('stream:end')
        break
      }

      socket.emit('stream:chunk', value)
    }
  } catch (error) {
    socket.emit('stream:error', error)
  } finally {
    reader.releaseLock()
  }
}

/**
 * A `ReadableStream` source that pulls the stream chunks
 * from the given `WebSocket` connection.
 *
 * @example
 * new ReadableStream(new WebSocketReadableStreamSource(socket))
 */
export class WebSocketReadableStreamSource implements UnderlyingSource {
  constructor(private readonly socket: Socket<StreamEventMap, any>) {}

  public start(controller: ReadableStreamDefaultController<any>) {
    this.socket
      .on('stream:chunk', (chunk) => controller.enqueue(chunk))
      .once('stream:error', (reason) => controller.error(reason))
      .once('stream:end', () => controller.close())
  }
}
