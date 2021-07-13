/**
 * @jest-environment jsdom
 */
import { augmentRequestInit } from './fetch'

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
