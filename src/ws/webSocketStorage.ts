import { matchRequestUrl } from '../utils/matching/matchRequestUrl'
import { WebSocketServer } from './WebSocketServer'

class WebSocketStorage {
  private servers: WebSocketServer[] = []

  public addServer(server: WebSocketServer): void {
    this.servers.push(server)
  }

  /**
   * Returns a mock WebSocket server that can intercept the given URL.
   */
  public findServer(url: string): WebSocketServer | undefined {
    const urlRecord = new URL(url)

    return this.servers.find((server) => {
      return matchRequestUrl(urlRecord, server.mask)
    })
  }
}

export const webSocketStorage = new WebSocketStorage()
