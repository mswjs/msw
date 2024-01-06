import { urlFromRequestOrCache } from './urlFromRequestOrCache'

test('should return the same URL object for the same request', () => {
  const request = new Request('https://example.com')
  const url = urlFromRequestOrCache(request)
  const url2 = urlFromRequestOrCache(request)
  expect(url).toBeInstanceOf(URL)
  expect(url).toBe(url2)
})

test('should return the same URL object for requests to the same url', () => {
  const request1 = new Request('https://example.com')
  const request2 = new Request('https://example.com')
  const url1 = urlFromRequestOrCache(request1)
  const url2 = urlFromRequestOrCache(request2)
  expect(url1).toBeInstanceOf(URL)
  expect(url1).toBe(url2)
})

test('should return different URL objects for different requests to different urls', () => {
  const request1 = new Request('https://example.com')
  const request2 = new Request('https://example.com/foo')
  const url1 = urlFromRequestOrCache(request1)
  const url2 = urlFromRequestOrCache(request2)
  expect(url1).toBeInstanceOf(URL)
  expect(url2).toBeInstanceOf(URL)
  expect(url1).not.toBe(url2)
})
