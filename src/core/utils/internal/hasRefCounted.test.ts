import { describe, expect, it } from 'vitest'
import { hasRefCounted } from './hasRefCounted'

describe('hasRefCounted', () => {
  it('returns true for objects with ref and unref methods', () => {
    expect(
      hasRefCounted({
        ref() {},
        unref() {},
      }),
    ).toBe(true)
  })

  it('returns false when either ref or unref is missing', () => {
    expect(
      hasRefCounted({
        ref() {},
      }),
    ).toBe(false)

    expect(
      hasRefCounted({
        unref() {},
      }),
    ).toBe(false)
  })
})
