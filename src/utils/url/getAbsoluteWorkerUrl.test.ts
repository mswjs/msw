/**
 * @jest-environment jsdom
 */
import { getAbsoluteWorkerUrl } from './getAbsoluteWorkerUrl'

describe('getAbsoluteWorkerUrl', () => {
  describe('given a relative worker URL', () => {
    it('should return an absolute URL against the current location', () => {
      expect(getAbsoluteWorkerUrl('./mockServiceWorker.js')).toEqual(
        'http://localhost/mockServiceWorker.js',
      )
    })
  })
})
