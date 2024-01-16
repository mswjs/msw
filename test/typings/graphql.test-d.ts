import { parse } from 'graphql'
import { graphql, HttpResponse } from 'msw'

/**
 * Request id.
 */
graphql.query('GetUser', ({ requestId }) => {
  requestId.toUpperCase()
})

/**
 * Variables type.
 */
graphql.mutation('CreateUser', ({ variables }) => {
  variables.id
  variables.unknown
})

graphql.mutation<never, { id: string }>('CreateUser', ({ variables }) => {
  variables.id.toUpperCase()
  // @ts-expect-error unknown variable name
  variables.unknown
})

graphql.mutation<never, never>('CreateUser', ({ variables }) => {
  // @ts-expect-error
  variables.id.toUpperCase()
  // @ts-expect-error
  variables.unknown
})

graphql.query<
  { key: string },
  // @ts-expect-error `null` is not a valid variables type.
  null
>('', () => {})

graphql.mutation<
  { key: string },
  // @ts-expect-error `null` is not a valid variables type.
  null
>('', () => {})

graphql.operation<
  { key: string },
  // @ts-expect-error `null` is not a valid variables type.
  null
>(() => {
  return HttpResponse.json({ data: { key: 'a' } })
})

/**
 * Response body type (GraphQL query type).
 */
// Returned mocked response body must satisfy the
// GraphQL query generic.
graphql.query<{ id: string }>('GetUser', () => {
  return HttpResponse.json({
    data: { id: '2' },
  })
})

graphql.query<{ id: string }>('GetUser', () => {
  return HttpResponse.json({
    // Explicit null must be allowed.
    data: null,
  })
})

graphql.query<{ id: string }>(
  'GetUser',
  // @ts-expect-error "id" type is incorrect
  () => {
    return HttpResponse.json({
      data: { id: 123 },
    })
  },
)

graphql.query<{ id: string }>(
  'GetUser',
  // @ts-expect-error response json is empty
  () => HttpResponse.json({ data: {} }),
)

graphql.query<{ id: string }>(
  'GetUser',
  // @ts-expect-error incompatible response body type
  () => HttpResponse.text('hello'),
)

///
///
///

graphql.query<{ key: string }>(
  'GetData',
  // @ts-expect-error Response data doesn't match the query type.
  () => {
    return HttpResponse.json({ data: {} })
  },
)

graphql.mutation<{ key: string }>('MutateData', () => {
  return HttpResponse.json({
    // Explicit null in mutations must also be allowed.
    data: null,
  })
})

graphql.mutation<{ key: string }>(
  'MutateData',
  // @ts-expect-error Response data doesn't match the query type.
  () => {
    return HttpResponse.json({ data: {} })
  },
)

graphql.operation<{ key: string }>(
  // @ts-expect-error Response data doesn't match the query type.
  () => {
    return HttpResponse.json({ data: {} })
  },
)

graphql.operation<{ key: string }>(() => {
  return HttpResponse.json({ data: null })
})

/**
 * Variables type.
 */

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
graphql.query(getUser, () => {
  return HttpResponse.json({
    // Cannot extract query type from the runtime `DocumentNode`.
    data: { arbitrary: true },
  })
})

// Both variable and response types can be extracted
// from a "TypedDocumentNode" value.
const getUserById = parse(`
  query GetUserById($userId: String!) {
    user(id: $userId) {
      firstName
    }
  }
`)
graphql.query(getUserById, ({ variables }) => {
  variables.userId.toUpperCase()

  // Extracting variables from the native "DocumentNode" is impossible.
  variables.foo

  return HttpResponse.json({
    data: {
      user: {
        firstName: 'John',
        // Extracting a query body type from the "DocumentNode" is impossible.
        lastName: 'Maverick',
      },
    },
  })
})

const createUser = parse(`
  mutation CreateUser {
    user {
      id
    }
  }
`)
graphql.mutation(createUser, () => {
  return HttpResponse.json({
    data: { arbitrary: true },
  })
})
