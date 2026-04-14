import { HttpPacket } from '../packets/http-packet'
import { NetworkSession } from '../session'

export class RemoteHttpTransport {
  #port: number

  constructor(args: { port: number }) {
    this.#port = args.port
  }

  public async handleRequest(args: { request: Request }) {
    const session = new NetworkSession({
      port: this.#port,
    })

    const socket = await session.socket
    const packet = new HttpPacket(args.request)

    return await packet.send(socket).catch(() => {})
  }
}
