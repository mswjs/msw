import { getJsonBody } from './getJsonBody'

describe('getJsonBody', () => {
  describe('given a valid JSON', () => {
    it('should return a parsed object', () => {
      expect(getJsonBody('{"prop":"value"}')).toEqual({ prop: 'value' })
    })
  })

  describe('given an invalid JSON', () => {
    it('should return it as text without changes', () => {
      expect(getJsonBody('{"prop:"value}')).toEqual('{"prop:"value}')
    })
  })
})
