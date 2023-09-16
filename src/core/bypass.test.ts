/**
 * @jest-environment jsdom
 */
import { bypass } from './bypass'

it('returns bypassed request given a request url string', async () => {
  const [url, init] = await bypass('/user')
  const headers = new Headers(init.headers)

  // Relative URLs are rebased against the current location.
  expect(url).toBe('/user')
  expect(headers.get('x-msw-intention')).toBe('bypass')
})

it('returns bypassed request given a request url', async () => {
  const [url, init] = await bypass(new URL('/user', 'https://api.github.com'))
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
  const [url, init] = await bypass(original)
  const headers = new Headers(init.headers)

  expect(url).toBe('http://localhost/resource')
  expect(init.method).toBe('POST')
  expect(init.body).toEqual(await original.arrayBuffer())
  expect(headers.get('x-msw-intention')).toBe('bypass')
  expect(headers.get('x-my-header')).toBe('value')
})
