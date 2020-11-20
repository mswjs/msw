import { body } from './body'
import { set } from './set'
import { response } from '../response'

test('sets a given body value without implicit "Content-Type" header', async () => {
  const result = await response(body('Lorem ipsum'))

  expect(result).toHaveProperty('body', 'Lorem ipsum')
  expect(result.headers.get('content-type')).toBeNull()
})

test('does not stringify raw body twice if content is string and "Content-Type" header is "json"', async () => {
  const result = await response(
    set('Content-Type', 'application/json'),
    body(JSON.stringify('some text')),
  )

  expect(result).toHaveProperty('body', `"some text"`)
})
