import { graphql } from '../graphql'

export const batchGraphQLHandler = graphql.query(
  'BatchGraphqlHandler',
  (req, res, ctx) => res(ctx.data({})),
)
