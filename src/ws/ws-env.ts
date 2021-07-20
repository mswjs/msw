import { WebSocketOvereride } from './WebSocketOverride'

export const MSW_WEBSOCKET_OVERRIDE_FLAG = 'MSW_WEBSOCKET_OVERRIDE'

export function setupWebSocketEnvironment() {
  // @ts-ignore
  window.UnpatchedWebSocket = WebSocket
  window.WebSocket = WebSocketOvereride

  // @ts-ignore
  // Mark WebSocket class as patched to prevent multiple patches.
  window.WebSocket[MSW_WEBSOCKET_OVERRIDE_FLAG] = true
}
