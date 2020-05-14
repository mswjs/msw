import { body } from './body'
import { response } from '../response'

describe('body', () => {
  describe('given a body value', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(body('Lorem ipsum'))
    })

    it('should not have any "Content-Type" header set', () => {
      expect(result.headers.get('content-type')).toBeNull()
    })

    it('should have body set to the given text', () => {
      expect(result).toHaveProperty('body', 'Lorem ipsum')
    })
  })
})
