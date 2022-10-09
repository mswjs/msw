/**
 * @jest-environment jsdom
 */
import { bypass } from './bypass'

it('returns bypassed request given a request url string', () => {
  const request = bypass('/user')

  expect(request.url).toBe('/user')
  expect(request.headers.get('x-msw-bypass')).toBe('true')
})

it('returns bypassed request given a request url', () => {
  const request = bypass(new URL('/user', 'https://api.github.com'))

  expect(request.url).toBe('https://api.github.com/user')
  expect(request.headers.get('x-msw-bypass')).toBe('true')
})

it('returns bypassed request given request instance', async () => {
  const original = new Request('/resource', {
    method: 'POST',
    headers: {
      'X-My-Header': 'value',
    },
    body: 'hello world',
  })
  const request = bypass(original)

  expect(request.method).toBe('POST')
  expect(request.url).toBe('/resource')
  expect(request.headers.get('x-msw-bypass')).toBe('true')
  expect(request.headers.get('x-my-header')).toBe('value')
  expect(await request.text()).toBe('hello world')
})
