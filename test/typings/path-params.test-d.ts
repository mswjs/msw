import { rest } from 'msw'

rest.get<never, { userId: string }>('/user/:userId', (req) => {
  req.params.userId

  // @ts-expect-error `unknown` is not defined in the request params type.
  req.params.unknown
})

rest.get<never>('/user/:id', (req, res, ctx) => {
  const { userId } = req.params

  return res(
    ctx.body(
      // @ts-expect-error "userId" parameter is not annotated
      // and is ambiguous (string | string[]).
      userId,
    ),
  )
})

rest.get<
  never,
  // @ts-expect-error Path parameters are always strings.
  // Parse them to numbers in the resolver if necessary.
  { id: number }
>('/posts/:id', () => null)

/**
 * Using interface as path parameters type.
 */
interface UserParamsInterface {
  userId: string
}

rest.get<never, UserParamsInterface>('/user/:userId', (req) => {
  req.params.userId.toUpperCase()

  // @ts-expect-error Unknown path parameter "foo".
  req.params.foo
})

/**
 * Using type as path parameters type.
 */
type UserParamsType = {
  userId: string
}

rest.get<never, UserParamsType>('/user/:userId', (req) => {
  req.params.userId.toUpperCase()

  // @ts-expect-error Unknown path parameter "foo".
  req.params.foo
})
