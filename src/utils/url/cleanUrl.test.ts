import { cleanUrl } from './cleanUrl'

test('removes query parameters from a URL string', () => {
  expect(cleanUrl('/user?id=123')).toEqual('/user')
  expect(cleanUrl('/user?id=123&id=456')).toEqual('/user')
  expect(cleanUrl('/user?id=123&role=admin')).toEqual('/user')
})

test('removes hashes from a URL string', () => {
  expect(cleanUrl('/user#hash')).toEqual('/user')
  expect(cleanUrl('/user#hash-with-dashes')).toEqual('/user')
})

test('removes both query parameters and hashes from a URL string', () => {
  expect(cleanUrl('/user?id=123#some')).toEqual('/user')
  expect(cleanUrl('/user?id=123&role=admin#some')).toEqual('/user')
})
