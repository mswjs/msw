import { isStringEqual } from './is-string-equal'

describe('isStringEqual', () => {
  describe('given two uppercase strings', () => {
    describe('and the strings are equal', () => {
      test('should return true', () => {
        expect(isStringEqual('GET', 'GET')).toBe(true)
      })
    })

    describe('and the strings are not equal', () => {
      test('should return false', () => {
        expect(isStringEqual('GET', 'POST')).toBe(false)
      })
    })
  })

  describe('given two lowercase strings', () => {
    describe('and the strings are equal', () => {
      test('should return true', () => {
        expect(isStringEqual('get', 'get')).toBe(true)
      })
    })

    describe('and the strings are not equal', () => {
      test('should return false', () => {
        expect(isStringEqual('get', 'post')).toBe(false)
      })
    })
  })

  describe('given two strings cased differently', () => {
    describe('and the strings are equal', () => {
      test('should return true', () => {
        expect(isStringEqual('get', 'GET')).toBe(true)
      })
    })

    describe('and the strings are not equal', () => {
      test('should return false', () => {
        expect(isStringEqual('get', 'POST')).toBe(false)
      })
    })
  })
})
