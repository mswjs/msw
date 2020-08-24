import { getDataLength } from './getDataLength'

test('returns string lengths', () => {
  expect(getDataLength('something')).toBe(9)
})

test('returns blob length', () => {
  const blob = new Blob(['a', 'blob', 'part'])
  expect(getDataLength(blob)).toBe(9)
})

test('returns ArrayBuffer length', () => {
  const buffer = new ArrayBuffer(9)
  expect(getDataLength(buffer)).toBe(9)
})
