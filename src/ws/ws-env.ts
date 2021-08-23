import { WebSocketOverride } from './WebSocketOverride'

export function setupWebSocketEnvironment() {
  window.OriginalWebSocket = WebSocket
  window.WebSocket = WebSocketOverride as any

  // Mark WebSocket class as patched to prevent multiple patches.
  window.WebSocket.__mswOverride = true
}
