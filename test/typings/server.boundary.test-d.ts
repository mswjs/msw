import { setupServer } from 'msw/node'

const fn = (_args: { a: number }): string => 'hello'

const server = setupServer()
const bound = server.boundary(fn)

bound({ a: 1 }).toUpperCase()

bound({
  // @ts-expect-error Expected number, got string.
  a: '1',
})

// @ts-expect-error Unknown method ".fooBar()" on string.
bound({ a: 1 }).fooBar()
