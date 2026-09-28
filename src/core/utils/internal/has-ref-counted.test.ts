import { hasRefCounted } from './has-ref-counted'

test('returns true for objects with ref and unref methods', () => {
  expect(
    hasRefCounted({
      ref() {},
      unref() {},
    }),
  ).toBe(true)
})

test('returns false for a non-refcounted object', () => {
  expect(hasRefCounted({})).toBe(false)
  expect(hasRefCounted({ ref() {} })).toBe(false)
  expect(hasRefCounted({ unref() {} })).toBe(false)
})

test('returns false for non-object values', () => {
  expect(
    hasRefCounted(
      // @ts-expect-error Runtime value.
      null,
    ),
  ).toBe(false)
  expect(
    hasRefCounted(
      // @ts-expect-error Runtime value.
      123,
    ),
  ).toBe(false)
  expect(
    hasRefCounted(
      // @ts-expect-error Runtime value.
      'invalid',
    ),
  ).toBe(false)
})
