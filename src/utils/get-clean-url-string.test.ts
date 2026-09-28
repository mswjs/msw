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
