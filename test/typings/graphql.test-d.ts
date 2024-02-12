import { parse } from 'graphql'
import { graphql, HttpResponse, passthrough } from 'msw'
import { expectTypeOf, it } from 'vitest'

it('graphql mutation can be used without variables generic type', () => {
  graphql.mutation('GetUser', () => {
    return HttpResponse.json({ data: { id: '2' } })
  })
})

it('graphql mutation accepts inline generic variables type', () => {
  graphql.mutation<never, { id: string }>('GetUser', ({ variables }) => {
    expectTypeOf(variables).toEqualTypeOf<{ id: string }>()
  })
})

it('graphql mutation accepts inline generic variables never type', () => {
  graphql.mutation<never, never>('CreateUser', ({ variables }) => {
    expectTypeOf(variables).toEqualTypeOf<never>()
  })
})

it("graphql mutation does not accept null as variables' generic mutation type", () => {
  graphql.mutation<
    { key: string },
    // @ts-expect-error `null` is not a valid variables type.
    null
  >('', () => {})
})

it('graphql mutation allows explicit null as the response body type for the mutation', () => {
  graphql.mutation<{ key: string }>('MutateData', () => {
    return HttpResponse.json({
      // Explicit null in mutations must also be allowed.
      data: null,
    })
  })
})
it('graphql mutation does not allow mismatched mutation response', () => {
  graphql.mutation<{ key: string }>(
    'MutateData',
    // @ts-expect-error Response data doesn't match the query type.
    () => {
      return HttpResponse.json({ data: {} })
    },
  )
})

it("graphql query does not accept null as variables' generic query type ", () => {
  graphql.query<
    { key: string },
    // @ts-expect-error `null` is not a valid variables type.
    null
  >('', () => {})
})
it("graphql query accepts the correct type for the variables' generic query type", () => {
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
})

it('graphql query allows explicit null as the response body type for the query', () => {
  graphql.query<{ id: string }>('GetUser', () => {
    return HttpResponse.json({
      // Explicit null must be allowed.
      data: null,
    })
  })
})

it('graphql query does not accept invalid data type for the response body type for the query', () => {
  graphql.query<{ id: string }>(
    'GetUser',
    // @ts-expect-error "id" type is incorrect
    () => {
      return HttpResponse.json({
        data: { id: 123 },
      })
    },
  )
})

it('graphql query does not allow empty response when the query type is defined', () => {
  graphql.query<{ id: string }>(
    'GetUser',
    // @ts-expect-error response json is empty
    () => HttpResponse.json({ data: {} }),
  )
})

it('graphql query does not allow incompatible response body type', () => {
  graphql.query<{ id: string }>(
    'GetUser',
    // @ts-expect-error incompatible response body type
    () => HttpResponse.text('hello'),
  )
})

it("graphql operation does not accept null as variables' generic operation type", () => {
  graphql.operation<
    { key: string },
    // @ts-expect-error `null` is not a valid variables type.
    null
  >(() => {
    return HttpResponse.json({ data: { key: 'a' } })
  })
})

it('graphql operation does not allow mismatched operation response', () => {
  graphql.operation<{ key: string }>(
    // @ts-expect-error Response data doesn't match the query type.
    () => {
      return HttpResponse.json({ data: {} })
    },
  )
})

it('graphql operation allows explicit null as the response body type for the operation', () => {
  graphql.operation<{ key: string }>(() => {
    return HttpResponse.json({ data: null })
  })
})

it('graphql handlers allow passthrough responses', () => {
  // Passthrough responses.
  graphql.query('GetUser', () => passthrough())
  graphql.mutation('AddPost', () => passthrough())
  graphql.operation(() => passthrough())
  graphql.query('GetUser', ({ request }) => {
    if (request.headers.has('cookie')) {
      return passthrough()
    }

    return HttpResponse.json({ data: {} })
  })

  it("graphql variables cannot extract type from the runtime 'DocumentNode'", () => {
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
  })

  it('graphql query cannot extract variable and reponse types', () => {
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
  })

  it('graphql mutation cannot extract variable and reponse types', () => {
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
  })
})
