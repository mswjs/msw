declare module 'virtual:msw/options' {
  export const defaultNetworkOptions:
    | typeof import('msw/browser').defaultNetworkOptions
    | typeof import('msw/node').defaultNetworkOptions
}
