import { status } from './status'
import { response } from '../response'

describe('status', () => {
  describe('given a status code', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(status(403))
    })

    it('should set status code on the response', () => {
      expect(result).toHaveProperty('status', 403)
    })

    it('should have the default status text (OK)', () => {
      expect(result).toHaveProperty('statusText', 'OK')
    })
  })

  describe('given a status code and a status text', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(status(301, 'Custom text'))
    })

    it('should set status code on the response', () => {
      expect(result).toHaveProperty('status', 301)
    })

    it('should have the custom status text', () => {
      expect(result).toHaveProperty('statusText', 'Custom text')
    })
  })
})
