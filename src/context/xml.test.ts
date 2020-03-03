import { xml } from './xml'
import { response } from '../response'
import { assertHeader } from '../utils/assertHeader'

describe('xml', () => {
  describe('given an XML string', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(xml('<firstName>John</firstName'))
    })

    it('should have "Content-Type" as "text/xml"', () => {
      assertHeader(result.headers, 'Content-Type', 'text/xml')
    })

    it('should have body set to the given XML', () => {
      expect(result).toHaveProperty('body', '<firstName>John</firstName')
    })
  })
})
