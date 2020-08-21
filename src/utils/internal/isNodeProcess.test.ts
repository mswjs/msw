/**
 * @jest-environment jsdom
 */
import { isNodeProcess } from './isNodeProcess'

test('returns true when run in a jsdom environment', () => {
  expect(isNodeProcess()).toBe(true)
})
