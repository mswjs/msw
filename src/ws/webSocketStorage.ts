import { matchRequestUrl } from '../utils/matching/matchRequestUrl'
import { WebSocketServer } from './WebSocketServer'

class WebSocketStorage {
  servers: WebSocketServer[] = []

  addServer(server: WebSocketServer) {
    this.servers.push(server)
  }

  findServer(url: string) {
    const urlRecord = new URL(url)

    return this.servers.find((server) => {
      return matchRequestUrl(urlRecord, server.mask)
    })
  }
}

export const webSocketStorage = new WebSocketStorage()
