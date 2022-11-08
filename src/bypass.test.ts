/**
 * @jest-environment jsdom
 */
import { Headers } from 'headers-polyfill'
import { Request } from './Request'
import { bypass } from './bypass'

it('returns bypassed request given a request url string', () => {
  const [url, init] = bypass('/user')
  const headers = new Headers(init.headers)

  // Relative URLs are rebased against the current location.
  expect(url).toBe('http://localhost/user')
  expect(headers.get('x-msw-intention')).toBe('bypass')
})

it('returns bypassed request given a request url', () => {
  const [url, init] = bypass(new URL('/user', 'https://api.github.com'))
  const headers = new Headers(init.headers)

  expect(url).toBe('https://api.github.com/user')
  expect(headers.get('x-msw-intention')).toBe('bypass')
})

it('returns bypassed request given request instance', async () => {
  const original = new Request('http://localhost/resource', {
    method: 'POST',
    headers: {
      'X-My-Header': 'value',
    },
    body: 'hello world',
  })
  const [url, init] = bypass(original)
  const headers = new Headers(init.headers)

  expect(url).toBe('http://localhost/resource')
  expect(init.method).toBe('POST')
  expect(init.body).toEqual(original.body)
  expect(headers.get('x-msw-intention')).toBe('bypass')
  expect(headers.get('x-my-header')).toBe('value')
})
