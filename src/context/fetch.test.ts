import { augmentRequestInit, createFetchRequestParameters } from './fetch'
import { MockedRequest } from '../utils/handlers/requestHandler'
import { Headers } from 'headers-utils/lib'

describe('augmentRequestInit', () => {
  describe('given provided custom headers', () => {
    describe('and headers is the instance of Headers', () => {
      let result: ReturnType<typeof augmentRequestInit>
      let headers: Headers

      beforeAll(() => {
        const init = {
          headers: new Headers({ Authorization: 'token' }),
        }

        result = augmentRequestInit(init)
        headers = new Headers(result.headers)
      })

      it('should preserve custom headers', () => {
        expect(headers.get('Authorization')).toEqual('token')
      })

      it('should append "x-msw-bypass" header', () => {
        expect(headers.get('x-msw-bypass')).toEqual('true')
      })
    })

    describe('and headers is a string[][] object', () => {
      let result: ReturnType<typeof augmentRequestInit>
      let headers: Headers

      beforeAll(() => {
        const init = {
          headers: [['Authorization', 'token']],
        }

        result = augmentRequestInit(init)
        headers = new Headers(result.headers)
      })

      it('should append "x-msw-bypass" header', () => {
        expect(headers.get('x-msw-bypass')).toEqual('true')
      })

      it('should preserve custom headers', () => {
        expect(headers.get('authorization')).toEqual('token')
      })
    })

    describe('and headers is a Record<string, string> object', () => {
      let result: ReturnType<typeof augmentRequestInit>
      let headers: Headers

      beforeAll(() => {
        const init = {
          headers: {
            Authorization: 'token',
          },
        }

        result = augmentRequestInit(init)
        headers = new Headers(result.headers)
      })

      it('should append "x-msw-bypass" header', () => {
        expect(headers.get('x-msw-bypass')).toEqual('true')
      })

      it('should preserve custom headers', () => {
        expect(headers.get('authorization')).toEqual('token')
      })
    })
  })
})

describe('createFetchRequestParameters', () => {
  let mockedRequest: MockedRequest

  beforeAll(() => {
    mockedRequest = {
      url: new URL('http://www.mswjs.io'),
      method: 'GET',
      headers: new Headers(),
      cookies: {},
      mode: 'same-origin',
      keepalive: true,
      cache: 'default',
      destination: '',
      integrity: '',
      credentials: 'same-origin',
      redirect: 'follow',
      referrer: '',
      referrerPolicy: 'origin',
      body: {},
      bodyUsed: true,
      params: {},
    }
  })

  describe('given a GET request', () => {
    it('should set the body to null', () => {
      const result = createFetchRequestParameters(mockedRequest)
      expect(result.body).toEqual(null)
    })
  })

  describe('given a HEAD request', () => {
    it('should set the body to null', () => {
      mockedRequest.method = 'HEAD'

      const result = createFetchRequestParameters(mockedRequest)
      expect(result.body).toEqual(null)
    })
  })

  describe('given a POST request', () => {
    it('should keep the body', () => {
      const body = {
        foo: 'bar',
      }
      mockedRequest.method = 'POST'
      mockedRequest.body = body

      const result = createFetchRequestParameters(mockedRequest)
      expect(result.body).toEqual(JSON.stringify(body))
    })
  })
})
