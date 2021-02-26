/**
 * @jest-environment node
 */
import { isNodeProcess } from './isNodeProcess'

test('returns true when run in a Node.js process', () => {
  expect(isNodeProcess()).toBe(true)
})
