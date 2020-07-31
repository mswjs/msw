/**
 * @jest-environment node
 */
import { cookie } from './cookie'
import { response } from '../response'

test('sets a cookie on the response headers, node environment', () => {
  const result: ReturnType<typeof response> = response(
    cookie('my-cookie', 'arbitrary-value'),
  )
  expect(result.headers.get('set-cookie')).toEqual('my-cookie=arbitrary-value')
})
