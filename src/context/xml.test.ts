import { xml } from './xml'
import { response } from '../response'

describe('xml', () => {
  describe('given an XML string', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(xml('<firstName>John</firstName'))
    })

    it('should have "Content-Type" as "text/xml"', () => {
      expect(result.headers.get('content-type')).toEqual('text/xml')
    })

    it('should have body set to the given XML', () => {
      expect(result).toHaveProperty('body', '<firstName>John</firstName')
    })
  })
})
