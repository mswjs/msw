import { rest } from 'msw'

rest.get<{ userId: string }, { postCount: number }>(
  '/user',
  (req, res, ctx) => {
    req.body.userId

    // @ts-expect-error `session` property is not defined on the request body type.
    req.body.session

    res(
      // @ts-expect-error JSON doesn't match given response body generic type.
      ctx.json({ unknown: true }),
    )

    res(
      // @ts-expect-error value types do not match
      ctx.json({ postCount: 'this is not a number' }),
    )

    return res(ctx.json({ postCount: 2 }))
  },
)

rest.get<any, any, { userId: string }>('/user/:userId', (req, res, ctx) => {
  req.params.userId

  // @ts-expect-error `unknown` is not defined in the request params type.
  req.params.unknown
})

rest.post<// @ts-expect-error `null` is not a valid request body type.
null>('/submit', () => null)

rest.get<
  any,
  // @ts-expect-error `null` is not a valid response body type.
  null
>('/user', () => null)

rest.get<any, { label: boolean }>('/user', (req, res, ctx) =>
  // allow ResponseTransformer to contain a more specific type
  res(ctx.json({ label: true })),
)

rest.get<any, string | string[]>('/user', (req, res, ctx) =>
  // allow ResponseTransformer to return a narrower type than a given union
  res(ctx.json('hello')),
)
