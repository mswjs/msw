import { setupServer } from 'msw/node'
import { test } from 'vitest'

const fn = (_args: { a: number }): string => 'hello'

const server = setupServer()
const bound = server.boundary(fn)

bound({ a: 1 }).toUpperCase()

bound({
  // @ts-expect-error Expected number, got string.
  a: '1',
})

bound({ a: 1 })
  // @ts-expect-error Unknown method ".fooBar()" on string.
  .fooBar()

test(
  'should work',
  server.boundary(({ expect }) => {
    expect(true).toBe(true)
    // @ts-expect-error Property 'doesntExist' does not exist on type 'ExpectStatic'
    expect.doesntExist
  }),
)
