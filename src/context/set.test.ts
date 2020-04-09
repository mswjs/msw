import { set } from './set'
import { response } from '../response'

describe('test', () => {
  describe('given a single header', () => {
    it('should set the header on the response', () => {
      const { headers } = response(set('Content-Type', 'image/*'))
      expect(headers.get('content-type')).toEqual('image/*')
    })
  })

  describe('given a single header with multiple values', () => {
    it('should set the header with all the values on the response', () => {
      const { headers } = response(
        set({
          Accept: ['application/json', 'image/png'],
        }),
      )

      expect(headers.get('accept')).toEqual('application/json, image/png')
    })
  })

  describe('given multiple headers', () => {
    it('should set all the headers on the response', () => {
      const { headers } = response(
        set({
          Accept: '*/*',
          'Accept-Language': 'en',
          'Content-Type': 'application/json',
        }),
      )

      expect(headers.get('accept')).toEqual('*/*')
      expect(headers.get('accept-language')).toEqual('en')
      expect(headers.get('content-type')).toEqual('application/json')
    })
  })
})
