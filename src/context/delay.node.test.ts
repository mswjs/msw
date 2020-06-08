/**
 * @jest-environment node
 */
import { delay, SERVER_RESPONSE_TIME_NODE } from './delay'
import { response } from '../response'

describe('delay', () => {
  describe('if no delay provided ', () => {
    it('should set no delay on the response if the env is node', () => {
      const endResponse = response(delay())
      expect(endResponse.delay).toBe(SERVER_RESPONSE_TIME_NODE)
    })
  })
})
