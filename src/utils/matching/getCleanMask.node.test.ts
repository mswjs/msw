/**
 * @jest-environment node
 */
import { getCleanMask } from './getCleanMask'

test('returns clean URL given a URL mask', () => {
  const mask = new URL('https://test.mswjs.io/path?query=123#some')
  expect(getCleanMask(mask)).toBe('https://test.mswjs.io/path')
})

test('returns a relative URL as-is given a string mask', () => {
  const mask = '/relative/url'
  expect(getCleanMask(mask)).toBe('/relative/url')
})

test('returns RegExp mask as-is', () => {
  const mask = /\/user\/(.+?)\//
  expect(getCleanMask(mask)).toEqual(mask)
})
