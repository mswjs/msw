import { parse } from 'graphql'
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

/**
 * Supports `DocumentNode` as the GraphQL operation name.
 */
const getUser = parse(`
  query GetUser {
    user {
      firstName
    }
  }
`)
graphql.query(getUser, (req, res, ctx) =>
  res(
    ctx.data({
      // Cannot extract query type from the runtime `DocumentNode`.
      arbitrary: true,
    }),
  ),
)

const getUserById = parse(`
  query GetUserById($userId: String!) {
    user(id: $userId) {
      firstName
    }
  }
`)
graphql.query(getUserById, (req, res, ctx) => {
  req.variables.userId

  // Extracting variables from the native "DocumentNode" is impossible.
  req.variables.foo

  return res(
    ctx.data({
      user: {
        firstName: 'John',
        // Extracting a query body type from the "DocumentNode" is impossible.
        lastName: 'Maverick',
      },
    }),
  )
})

const createUser = parse(`
  mutation CreateUser {
    user {
      id
    }
  }
`)
graphql.mutation(createUser, (req, res, ctx) =>
  res(
    ctx.data({
      arbitrary: true,
    }),
  ),
)
