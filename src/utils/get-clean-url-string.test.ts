import { getCleanUrlString } from './get-clean-url-string'

it('removes query parameters from a URL string', () => {
  expect(getCleanUrlString('/user?id=123')).toEqual('/user')
  expect(getCleanUrlString('/user?id=123&id=456')).toEqual('/user')
  expect(getCleanUrlString('/user?id=123&role=admin')).toEqual('/user')
})

it('removes hashes from a URL string', () => {
  expect(getCleanUrlString('/user#hash')).toEqual('/user')
  expect(getCleanUrlString('/user#hash-with-dashes')).toEqual('/user')
})

it('removes both query parameters and hashes from a URL string', () => {
  expect(getCleanUrlString('/user?id=123#some')).toEqual('/user')
  expect(getCleanUrlString('/user?id=123&role=admin#some')).toEqual('/user')
})

it('preserves optional path parameters', () => {
  expect(getCleanUrlString('/user/:id?')).toEqual('/user/:id?')
  expect(getCleanUrlString('/user/:id?/:messageId?')).toEqual(
    '/user/:id?/:messageId?',
  )
})
