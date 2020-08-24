import { WebSocketOvereride } from './WebSocketOverride'

export function setupWebSocketEnvironment() {
  // @ts-ignore
  window.UnpatchedWebSocket = WebSocket

  WebSocket = WebSocketOvereride

  // @ts-ignore
  // Mark WebSocket class as patched to prevent multiple patches.
  WebSocket.__mswPatch = true
}
