import { resolveMask } from './resolveMask'

test('returns regular expression as-is', () => {
  expect(resolveMask(/\/user\//g)).toEqual(/\/user\//g)
})

test('creates a URL instance from a valid relative URL', () => {
  const url = resolveMask('/user') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('http://localhost/user')
})

test('created a URL instance from a valid absolute URL', () => {
  const url = resolveMask('https://test.mswjs.io/user') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('https://test.mswjs.io/user')
})

test('creates a URL instance given a path with parameters', () => {
  const url = resolveMask('/user/:userId') as URL
  expect(url).toBeInstanceOf(URL)
  expect(url.toString()).toBe('http://localhost/user/:userId')
})

test('returns a path string as-is', () => {
  expect(resolveMask('*')).toBe('*')
})
