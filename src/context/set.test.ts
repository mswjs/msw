import { set } from './set'
import { response } from '../response'
import { assertHeader } from '../utils/assertHeader'

describe('test', () => {
  describe('given a single header', () => {
    it('should set it on the response', () => {
      const { headers } = response(set('Content-Type', 'image/*'))
      assertHeader(headers, 'Content-Type', 'image/*')
    })
  })

  describe('given multiple headers', () => {
    it('should set them on the response', () => {
      const { headers } = response(
        set({
          Accept: '*/*',
          'Accept-Language': 'en',
          'Content-Type': 'appliaction/json',
        }),
      )

      assertHeader(headers, 'Accept', '*/*')
      assertHeader(headers, 'Accept-Language', 'en')
      assertHeader(headers, 'Content-Type', 'appliaction/json')
    })
  })
})
