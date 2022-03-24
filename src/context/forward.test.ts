/**
 * @jest-environment jsdom
 */
import { forward, RESPONSE_FORWARD } from './forward'

test('returns the symbol constant', () => {
  const result = forward()

  expect(result).toEqual(RESPONSE_FORWARD)
})
