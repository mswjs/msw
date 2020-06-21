/**
 * @jest-environment node
 */
import { isNodeProcess } from './isNodeProcess'

test('returns true when run in a NodeJS process', () => {
  expect(isNodeProcess()).toBe(true)
})
