/**
 * @vitest-environment jsdom
 */
import { bypass } from './bypass'

it('returns bypassed request given a request url string', async () => {
  const request = bypass('https://api.example.com/resource')

  // Relative URLs are rebased against the current location.
  expect(request.method).toBe('GET')
  expect(request.url).toBe('https://api.example.com/resource')
  expect(Object.fromEntries(request.headers.entries())).toEqual({
    'x-msw-intention': 'bypass',
  })
})

it('returns bypassed request given a request url', async () => {
  const request = bypass(new URL('/resource', 'https://api.example.com'))

  expect(request.url).toBe('https://api.example.com/resource')
  expect(Object.fromEntries(request.headers)).toEqual({
    'x-msw-intention': 'bypass',
  })
})

it('returns bypassed request given request instance', async () => {
  const original = new Request('http://localhost/resource', {
    method: 'POST',
    headers: {
      'X-My-Header': 'value',
    },
    body: 'hello world',
  })
  const request = bypass(original)

  expect(request.method).toBe('POST')
  expect(request.url).toBe('http://localhost/resource')

  const bypassedRequestBody = await request.text()
  expect(original.bodyUsed).toBe(false)

  expect(bypassedRequestBody).toEqual(await original.text())
  expect(Object.fromEntries(request.headers.entries())).toEqual({
    ...Object.fromEntries(original.headers.entries()),
    'x-msw-intention': 'bypass',
  })
})

it('allows modifying the bypassed request instance', async () => {
  const original = new Request('http://localhost/resource', {
    method: 'POST',
    body: 'hello world',
  })
  const request = bypass(original, {
    method: 'PUT',
    headers: { 'x-modified-header': 'yes' },
  })

  expect(request.method).toBe('PUT')
  expect(Object.fromEntries(request.headers.entries())).toEqual({
    'x-msw-intention': 'bypass',
    'x-modified-header': 'yes',
  })
  expect(original.bodyUsed).toBe(false)
  expect(request.bodyUsed).toBe(false)

  expect(await request.text()).toBe('hello world')
  expect(original.bodyUsed).toBe(false)
})
