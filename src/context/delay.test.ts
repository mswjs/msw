import {
  delay,
  MIN_SERVER_RESPONSE_TIME,
  MAX_SERVER_RESPONSE_TIME,
} from './delay'
import { response } from '../response'

describe('delay', () => {
  describe('given a delay ', () => {
    it('should set delay on the response', () => {
      const endResponse = response(delay(1200))
      expect(endResponse).toHaveProperty('delay', 1200)
    })
  })

  describe('if no delay provided ', () => {
    it('should set random delay on the response', () => {
      const endResponse = response(delay())
      expect(endResponse.delay).toBeGreaterThanOrEqual(MIN_SERVER_RESPONSE_TIME)
      expect(endResponse.delay).toBeLessThanOrEqual(MAX_SERVER_RESPONSE_TIME)
    })
  })
})
