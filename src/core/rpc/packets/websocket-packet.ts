import type { NetworkPacket } from '.'
import type { WebSocketResolutionContext } from '../../handlers/WebSocketHandler'
import type { NetworkSession } from '../session'

export class WebSocketPacket implements NetworkPacket {
  constructor(
    private readonly args: {
      url: string
      resolutionContext?: WebSocketResolutionContext
    },
  ) {}

  async send(session: NetworkSession): Promise<any> {
    const socket = await session.getClient()

    // 1. Create a frame that describe this WS connection.
    // 2. Send it over the `ws`.
    // 3. (?) Return the response?
    socket.send('...TODO...')
  }
}
