import { delay } from './delay'
import { response } from '../response'

describe('delay', () => {
  describe('given a delay ', () => {
    it('should set delay on the response', () => {
      const endResponse = response(delay(1200))
      expect(endResponse).toHaveProperty('delay', 1200)
    })
  })
})
