declare module 'virtual:msw' {
  import type {
    HttpNetworkFrame,
    NetworkApi,
    NetworkSource,
    WebSocketNetworkFrame,
  } from 'msw/experimental'

  export const network: Omit<
    NetworkApi<Array<NetworkSource<HttpNetworkFrame | WebSocketNetworkFrame>>>,
    'enable' | 'disable'
  > & {
    enable(): void | Promise<void>
    disable(): void | Promise<void>
  }
}
