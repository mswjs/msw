import { encodeBuffer, IsomorphicResponse } from '@mswjs/interceptors'

const noop = () => {
  throw new Error('Not implemented')
}

export function createResponseFromIsomorphicResponse(
  response: IsomorphicResponse,
): Response {
  return {
    ...response,
    ok: response.status >= 200 && response.status < 300,
    url: '',
    type: 'default',
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body: new ReadableStream(),
    redirected: response.headers.get('Location') != null,
    async text() {
      return response.body || ''
    },
    async json() {
      return JSON.parse(response.body || '')
    },
    async arrayBuffer() {
      return encodeBuffer(response.body || '')
    },
    bodyUsed: false,
    formData: noop,
    blob: noop,
    clone: noop,
  }
}
