/**
 * @jest-environment jsdom
 */
import { getUrlByMask } from './getUrlByMask'

test('returns regular expression as-is', () => {
  expect(getUrlByMask(/\/user\//g)).toEqual(/\/user\//g)
})

test('creates a URL instance from a valid relative URL', () => {
  const url = getUrlByMask('/user') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('http://localhost/user')
})

test('created a URL instance from a valid absolute URL', () => {
  const url = getUrlByMask('https://test.mswjs.io/user') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('https://test.mswjs.io/user')
})

test('creates a URL instance given a path with parameters', () => {
  const url = getUrlByMask('/user/:userId') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('http://localhost/user/:userId')
})

test('returns a URL-like path string as-is', () => {
  const url = getUrlByMask('http://*.mswjs.io/:resourceName')
  expect(typeof url).toBe('string')
  expect(url).toBe('http://*.mswjs.io/:resourceName')
})

test('returns a path string as-is', () => {
  const url = getUrlByMask('*')
  expect(typeof url).toBe('string')
  expect(url).toBe('*')
})
