import { graphql } from './graphql'

// @ts-expect-error
graphql.query<{ key: string }, null>('', (req, res, ctx) => res(ctx.data({})))

graphql.mutation<{ key: string }, null>('', (req, res, ctx) =>
  // @ts-expect-error
  res(ctx.data({})),
)

// @ts-expect-error
graphql.operation<{ key: string }, null>((req, res, ctx) => res(ctx.data({})))
