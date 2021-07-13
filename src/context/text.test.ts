/**
 * @jest-environment jsdom
 */
import { text } from './text'
import { response } from '../response'

test('sets a given text as the response body', async () => {
  const result = await response(text('Lorem ipsum'))

  expect(result.headers.get('content-type')).toEqual('text/plain')
  expect(result).toHaveProperty('body', 'Lorem ipsum')
})
