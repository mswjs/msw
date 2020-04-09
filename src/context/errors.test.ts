import { errors } from './errors'
import { response } from '../response'

describe('errors', () => {
  describe('given at list of errors', () => {
    let result: ReturnType<typeof response>

    beforeAll(() => {
      result = response(errors([{ message: 'Error message' }]))
    })

    it('should have "Content-Type" as "application/json"', () => {
      expect(result.headers.get('content-type')).toEqual('application/json')
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
