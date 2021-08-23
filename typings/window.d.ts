declare global {
  interface Window {
    OriginalWebSocket: typeof WebSocket
    WebSocket: PatchedWebSocket
  }

  interface PatchedWebSocket extends WebSocket {
    __mswOverride?: boolean
  }
}

export {}
