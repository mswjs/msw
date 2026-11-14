import { getCleanUrlString } from './get-clean-url-string'

test('removes query parameters from a URL string', () => {
  expect(getCleanUrlString('/user?id=123')).toEqual('/user')
  expect(getCleanUrlString('/user?id=123&id=456')).toEqual('/user')
  expect(getCleanUrlString('/user?id=123&role=admin')).toEqual('/user')
})

test('removes hashes from a URL string', () => {
  expect(getCleanUrlString('/user#hash')).toEqual('/user')
  expect(getCleanUrlString('/user#hash-with-dashes')).toEqual('/user')
})

test('removes both query parameters and hashes from a URL string', () => {
  expect(getCleanUrlString('/user?id=123#some')).toEqual('/user')
  expect(getCleanUrlString('/user?id=123&role=admin#some')).toEqual('/user')
})

test('preserves optional path parameters', () => {
  expect(getCleanUrlString('/user/:id?')).toEqual('/user/:id?')
  expect(getCleanUrlString('/user/:id?/:messageId?')).toEqual(
    '/user/:id?/:messageId?',
  )
})

test('preserves optional path parameters in the middle of the path', () => {
  expect(getCleanUrlString('/user/:id?/settings')).toEqual(
    '/user/:id?/settings',
  )
  expect(getCleanUrlString('/user/:id?/:messageId?/settings')).toEqual(
    '/user/:id?/:messageId?/settings',
  )
  expect(getCleanUrlString('http://localhost:3000/user/:id?/settings')).toEqual(
    'http://localhost:3000/user/:id?/settings',
  )
})

test('removes query parameters and hashes after optional path parameters', () => {
  expect(getCleanUrlString('/user/:id?/settings?tab=1')).toEqual(
    '/user/:id?/settings',
  )
  expect(getCleanUrlString('/user/:id?/settings#hash')).toEqual(
    '/user/:id?/settings',
  )
  expect(getCleanUrlString('/user/:id?#hash')).toEqual('/user/:id?')
  expect(getCleanUrlString('/user/:id?tab=1')).toEqual('/user/:id')
})

test('preserves optional path parameters separated by a dot', () => {
  expect(getCleanUrlString('/files/:name?.:ext?')).toEqual(
    '/files/:name?.:ext?',
  )
  expect(getCleanUrlString('/files/:name?.:ext?#hash')).toEqual(
    '/files/:name?.:ext?',
  )
  expect(getCleanUrlString('/files/:name?.:ext?tab=1')).toEqual(
    '/files/:name?.:ext',
  )
})

test('removes a query string that starts with a dot after a path parameter', () => {
  expect(getCleanUrlString('/user/:id?.json')).toEqual('/user/:id')
})

test('preserves pipe characters in the path', () => {
  expect(getCleanUrlString('/user/a|b/settings')).toEqual('/user/a|b/settings')
  expect(getCleanUrlString('/user/a|b?id=123')).toEqual('/user/a|b')
})
