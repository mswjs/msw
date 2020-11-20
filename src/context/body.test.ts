import { body } from './body'
import { response } from '../response'

test('sets a given body value without implicit "Content-Type" header', async () => {
  const result = await response(body('Lorem ipsum'))

  expect(result).toHaveProperty('body', 'Lorem ipsum')
  expect(result.headers.get('content-type')).toBeNull()
})
