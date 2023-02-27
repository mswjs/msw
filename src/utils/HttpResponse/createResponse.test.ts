/**
 * @jest-environment node
 */
import { Headers } from 'headers-polyfill'
import { createResponse } from './createResponse'

it('creates an empty response', () => {
  const response = createResponse(null, {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  })

  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(response.body).toBe(null)
  expect(Array.from(response.headers.entries())).toEqual([])
})

it('creates a text response', async () => {
  const response = createResponse('hello world', {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  })

  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(response.body).toBeInstanceOf(ReadableStream)
  expect(await response.text()).toBe('hello world')
  expect(Array.from(response.headers.entries())).toEqual([
    ['content-type', 'text/plain;charset=UTF-8'],
  ])
})

it('creates a json response', async () => {
  const response = createResponse(JSON.stringify({ firstName: 'John' }), {
    status: 200,
    statusText: 'OK',
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  })

  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
  expect(response.body).toBeInstanceOf(ReadableStream)
  expect(await response.json()).toEqual({ firstName: 'John' })
  expect(Array.from(response.headers.entries())).toEqual([
    ['content-type', 'application/json'],
  ])
})

it('forward a custom "type" response init property', () => {
  const response = createResponse(null, {
    type: 'opaque',
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  })

  expect(response.type).toBe('opaque')
})
