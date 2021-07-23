/**
 * @jest-environment jsdom
 */
import { getUrlByPath } from './getUrlByPath'

test('returns regular expression as-is', () => {
  expect(getUrlByPath(/\/user\//g)).toEqual(/\/user\//g)
})

test('creates a URL instance from a valid relative URL', () => {
  const url = getUrlByPath('/user') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('http://localhost/user')
})

test('created a URL instance from a valid absolute URL', () => {
  const url = getUrlByPath('https://test.mswjs.io/user') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('https://test.mswjs.io/user')
})

test('creates a URL instance given a path with parameters', () => {
  const url = getUrlByPath('/user/:userId') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('http://localhost/user/:userId')
})

test('returns a URL-like path string as-is', () => {
  const url = getUrlByPath('http://*.mswjs.io/:resourceName')
  expect(typeof url).toBe('string')
  expect(url).toBe('http://*.mswjs.io/:resourceName')
})

test('returns a path string as-is', () => {
  const url = getUrlByPath('*')
  expect(typeof url).toBe('string')
  expect(url).toBe('*')
})
