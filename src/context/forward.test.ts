/**
 * @jest-environment jsdom
 */
import { forward } from './forward'
import { response } from '../response'

test('bypass a request in a handler', async () => {
  await response(forward())

  expect(forward).not.toThrow()
})
