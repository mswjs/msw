import { xml } from './xml'
import { response } from '../response'

test('sets a given XML as the response body', async () => {
  const result = await response(xml('<firstName>John</firstName'))

  expect(result.headers.get('content-type')).toEqual('text/xml')
  expect(result).toHaveProperty('body', '<firstName>John</firstName')
})
