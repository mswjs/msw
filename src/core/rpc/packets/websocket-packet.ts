import type { NetworkPacket } from '.'
import type { WebSocketResolutionContext } from '../../handlers/WebSocketHandler'
import type { SessionSocket } from '../session'

export class WebSocketPacket implements NetworkPacket {
  constructor(
    private readonly args: {
      url: string
      resolutionContext?: WebSocketResolutionContext
    },
  ) {}

  async send(socket: SessionSocket): Promise<any> {
    // 1. Create a frame that describe this WS connection.
    // 2. Send it over the `ws`.
    // 3. (?) Return the response?
    socket.send('...TODO...')
  }
}
