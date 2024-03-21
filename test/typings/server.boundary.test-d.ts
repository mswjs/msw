import { it, expectTypeOf } from 'vitest'
import { setupServer } from 'msw/node'

const fn = (args: { a: number }): string => 'hello'

const server = setupServer()
const bound = server.boundary(fn)

it('infers the argument type of the callback', () => {
  expectTypeOf(bound).toEqualTypeOf<(args: { a: number }) => string>()
})

it('infers the return type of the callback', () => {
  expectTypeOf(bound({ a: 1 })).toEqualTypeOf<string>()
})
