import { augmentRequestInit } from './fetch'

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
