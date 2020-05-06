import { getCleanUrl } from './getCleanUrl'

describe('getCleanUrl', () => {
  describe('given a URL without query parameters or hash', () => {
    it('should return the URL as-is', () => {
      const url = new URL('https://test.msw.io/')
      expect(getCleanUrl(url)).toEqual('https://test.msw.io/')
    })
  })

  describe('given a URL with a hash', () => {
    it('should return a URL without hashes', () => {
      const url = new URL('https://test.msw.io/path#hash')
      expect(getCleanUrl(url)).toEqual('https://test.msw.io/path')
    })
  })

  describe('given a URL with a query parameter', () => {
    it('should return a URL without query parameters', () => {
      const url = new URL('https://test.msw.io/path?hello=true')
      expect(getCleanUrl(url)).toEqual('https://test.msw.io/path')
    })
  })

  describe('given a URL with a query parameter and hash', () => {
    it('should return a URL without query parameters and hashes', () => {
      const url = new URL('https://test.msw.io/path?hello=true#hash')
      expect(getCleanUrl(url)).toEqual('https://test.msw.io/path')
    })
  })
})
