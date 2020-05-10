import { augmentRequestInit } from './fetch'

describe('augmentRequestInit', () => {
  describe('given Headers object', () => {
    it('should have header "x-msw-bypass" and original headers', () => {
      const headers = new Headers()
      headers.set('Authorization', 'token')

      const requestInit = { headers }

      const result = augmentRequestInit(requestInit)
      const resultHeaders = new Headers(result.headers)

      expect(resultHeaders.get('Authorization')).toEqual('token')
      expect(resultHeaders.get('x-msw-bypass')).toEqual('true')
    })
  })

  describe('given string[][] object', () => {
    it('should have header "x-msw-bypass" and original headers', () => {
      const headers = [
        ['Authorization', 'token'],
        ['x-msw-bypass', 'true'],
      ]

      const requestInit = { headers }

      const result = augmentRequestInit(requestInit)
      const resultHeaders = new Headers(result.headers)

      expect(resultHeaders.get('Authorization')).toEqual('token')
      expect(resultHeaders.get('x-msw-bypass')).toEqual('true')
    })
  })

  describe('given Record<string, string> object', () => {
    it('should have header "x-msw-bypass" and original headers', () => {
      const headers: Record<string, string> = {
        Authorization: 'token',
        'x-msw-bypass': 'true',
      }

      const requestInit = { headers }

      const result = augmentRequestInit(requestInit)
      const resultHeaders = new Headers(result.headers)

      expect(resultHeaders.get('Authorization')).toEqual('token')
      expect(resultHeaders.get('x-msw-bypass')).toEqual('true')
    })
  })
})
