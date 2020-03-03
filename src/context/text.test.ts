import { text } from './text'
import { response } from '../response'
import { assertHeader } from '../utils/assertHeader'

describe('text', () => {
  describe('given a text body', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(text('Lorem ipsum'))
    })

    it('should have "Content-Type" as "text/plain"', () => {
      assertHeader(result.headers, 'Content-Type', 'text/plain')
    })

    it('should have body set to the given text', () => {
      expect(result).toHaveProperty('body', 'Lorem ipsum')
    })
  })
})
