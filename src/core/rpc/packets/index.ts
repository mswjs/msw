import type { SessionSocket } from '../session'

export interface NetworkPacket {
  send(socket: SessionSocket): Promise<any>
}
