export const Request: typeof globalThis.Request = globalThis.Request
  ? globalThis.Request
  : require('@mswjs/interceptors/lib/utils/RequestWithCredentials')
      .RequestWithCredentials
