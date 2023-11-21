/**
 * @vitest-environment node
 */
import { isAbsoluteUrl } from './isAbsoluteUrl'

test('returns true for the "http" scheme', () => {
  expect(isAbsoluteUrl('http://www.domain.com')).toEqual(true)
})

test('returns true for the "https" scheme', () => {
  expect(isAbsoluteUrl('https://www.domain.com')).toEqual(true)
})

test('returns true for the "ws" scheme', () => {
  expect(isAbsoluteUrl('ws://www.domain.com')).toEqual(true)
})

test('returns true for the "ftp" scheme', () => {
  expect(isAbsoluteUrl('ftp://www.domain.com')).toEqual(true)
})

test('returns true for the custom scheme', () => {
  expect(isAbsoluteUrl('web+my://www.example.com')).toEqual(true)
})

test('returns false for the relative URL', () => {
  expect(isAbsoluteUrl('/test')).toEqual(false)
})

test('returns false for the relative URL without a leading slash', () => {
  expect(isAbsoluteUrl('test')).toEqual(false)
})
