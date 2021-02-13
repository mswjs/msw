import { graphql } from 'msw'

graphql.query<{ key: string }>('', (req, res, ctx) => {
  return res(
    ctx.data(
      // @ts-expect-error Response data doesn't match the query type.
      {},
    ),
  )
})

graphql.query<
  { key: string },
  // @ts-expect-error `null` is not a valid variables type.
  null
>('', (req, res, ctx) => {
  return res(ctx.data({ key: 'pass' }))
})

graphql.mutation<{ key: string }>('', (req, res, ctx) =>
  res(
    ctx.data(
      // @ts-expect-error Response data doesn't match the query type.
      {},
    ),
  ),
)

graphql.mutation<
  { key: string },
  // @ts-expect-error `null` is not a valid variables type.
  null
>('', (req, res, ctx) => {
  return res(ctx.data({ key: 'pass' }))
})

graphql.operation<{ key: string }>((req, res, ctx) => {
  return res(
    ctx.data(
      // @ts-expect-error Response data doesn't match the query type.
      {},
    ),
  )
})

graphql.operation<
  { key: string },
  // @ts-expect-error `null` is not a valid variables type.
  null
>((req, res, ctx) => {
  return res(ctx.data({ key: 'pass' }))
})
