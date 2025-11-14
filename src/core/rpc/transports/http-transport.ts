import { HttpPacket } from '../packets/http-packet'
import { NetworkSession } from '../session'

/**
 * A cross-process transport that can handle outgoing requests
 * using the provided session connected to the remote.
 */
export class NetworkHttpTransport {
  #port: number

  constructor(args: { port: number }) {
    this.#port = args.port
  }

  public async handleRequest(args: {
    request: Request
  }): Promise<Response | undefined> {
    const session = new NetworkSession({
      port: this.#port,
    })
    const packet = new HttpPacket(args.request)
    const socket = await session.getSocket()

    return await packet.send(socket).catch(() => undefined)
  }
}
