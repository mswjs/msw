import { graphql } from './graphql'

graphql.query<{ key: string }>('', (req, res, ctx) => {
  // @ts-expect-error Response data doesn't match the query type.
  return res(ctx.data({}))
})

// @ts-expect-error `null` is not a valid variables type.
graphql.query<{ key: string }, null>('', (req, res, ctx) => {
  return res(ctx.data({ key: 'pass' }))
})

graphql.mutation<{ key: string }>('', (req, res, ctx) =>
  // @ts-expect-error Response data doesn't match the query type.
  res(ctx.data({})),
)

// @ts-expect-error `null` is not a valid variables type.
graphql.mutation<{ key: string }, null>('', (req, res, ctx) => {
  return res(ctx.data({ key: 'pass' }))
})

graphql.operation<{ key: string }>((req, res, ctx) => {
  // @ts-expect-error Response data doesn't match the query type.
  return res(ctx.data({}))
})

// @ts-expect-error `null` is not a valid variables type.
graphql.operation<{ key: string }, null>('', (req, res, ctx) => {
  return res(ctx.data({ key: 'pass' }))
})
