/**
 * @jest-environment jsdom
 */
import { augmentRequestInit, createFetchRequestParameters } from './fetch'
import { MockedRequest } from '../handlers/RequestHandler'
import HeadersPolyfill from 'headers-polyfill/lib/Headers'

test('augments RequestInit with the Headers instance', () => {
  const result = augmentRequestInit({
    headers: new Headers({ Authorization: 'token' }),
  })
  const headers = new Headers(result.headers)

  expect(headers.get('Authorization')).toEqual('token')
  expect(headers.get('x-msw-bypass')).toEqual('true')
})

test('augments RequestInit with the string[][] headers object', () => {
  const result = augmentRequestInit({
    headers: [['Authorization', 'token']],
  })
  const headers = new Headers(result.headers)

  expect(headers.get('x-msw-bypass')).toEqual('true')
  expect(headers.get('authorization')).toEqual('token')
})

test('aguments RequestInit with the Record<string, string> headers', () => {
  const result = augmentRequestInit({
    headers: {
      Authorization: 'token',
    },
  })
  const headers = new Headers(result.headers)

  expect(headers.get('x-msw-bypass')).toEqual('true')
  expect(headers.get('authorization')).toEqual('token')
})

test('removes the content-type header and creates fresh FormData for multipart/form-data, so that the browser can re-add it automatically and generate a fresh boundary value', () => {
  const CONTENT_TYPE =
    'multipart/form-data; boundary=----WebKitFormBoundaryostedjdEBW2xxin5'

  const input = {
    // User sends FormData in their app:
    // const formData = new FormData();
    // formData.append("key", "value");
    // fetch("/api", { method: "POST", body: formData });
    // User decides to proxy the intercepted request to real endpoint in their handler.js:
    // const proxy = await ctx.fetch(req);
    // Now fetch() from fetch.ts will receive the body as a plain object even though the user send FormData:
    body: {
      key: 'value',
    },
    headers: new HeadersPolyfill({
      'content-type': CONTENT_TYPE,
    }),
  } as unknown as MockedRequest

  const output = createFetchRequestParameters(input)
  // @ts-ignore
  expect(output.headers?.get('content-type')).toEqual(null)
  expect(output.body instanceof FormData).toBe(true)
})
