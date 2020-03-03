import { errors } from './errors'
import { response } from '../response'
import { assertHeader } from '../utils/assertHeader'

describe('errors', () => {
  describe('given at list of errors', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(errors([{ message: 'Error message' }]))
    })

    it('should have "Content-Type" as "application/json"', () => {
      assertHeader(result.headers, 'Content-Type', 'application/json')
    })

    it('should have body set to the given JSON nested in the "errors" property', () => {
      expect(result).toHaveProperty(
        'body',
        JSON.stringify({
          errors: [
            {
              message: 'Error message',
            },
          ],
        }),
      )
    })
  })
})
