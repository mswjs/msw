import { text } from './text'
import { response } from '../response'

describe('text', () => {
  describe('given a text body', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(text('Lorem ipsum'))
    })

    it('should have "Content-Type" as "text/plain"', () => {
      expect(result.headers.get('content-type')).toEqual('text/plain')
    })

    it('should have body set to the given text', () => {
      expect(result).toHaveProperty('body', 'Lorem ipsum')
    })
  })
})
