import { it, expectTypeOf } from 'vitest'
import { parse } from 'graphql'
import type {
  DocumentTypeDecoration,
  TypedDocumentNode,
} from '@graphql-typed-document-node/core'
import { HttpResponse, passthrough, type PathParams } from 'msw'
import {
  graphql,
  type GraphQLPassthroughSubscription,
  type GraphQLSubscription,
  type GraphQLSubscriptionPayload,
} from 'msw/graphql'

/**
 * The two document flavors emitted by GraphQL Code Generator:
 * a `TypedDocumentNode` (the "typed-document-node" plugin) and a
 * `TypedDocumentString` (the "client" preset).
 */
declare function createTypedDocumentNode<TResult = any, TVariables = any>(
  query: string,
): TypedDocumentNode<TResult, TVariables>

declare function createTypedDocumentString<TResult = any, TVariables = any>(
  query: string,
): DocumentTypeDecoration<TResult, TVariables>

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
  graphql.mutation<{ key: string }>('MutateData', () => {
    return HttpResponse.json({
      // @ts-expect-error Response data doesn't match the query type.
      data: {},
    })
  })
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

it('supports nullable queries', () => {
  graphql.query<{ id: string } | null>('GetUser', () => {
    return HttpResponse.json({
      data: null,
    })
  })
})

it('supports nullable mutations', () => {
  graphql.mutation<{ id: string } | null>('GetUser', () => {
    return HttpResponse.json({
      data: null,
    })
  })
})

it('graphql query does not accept invalid data type for the response body type for the query', () => {
  graphql.query<{ id: string }>('GetUser', () => {
    return HttpResponse.json({
      data: {
        // @ts-expect-error "id" type is incorrect
        id: 123,
      },
    })
  })
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

it('graphql operation does not accept null as variables type', () => {
  graphql.operation<
    { key: string },
    // @ts-expect-error `null` is not a valid variables type.
    null
  >(() => {
    return HttpResponse.json({ data: { key: 'a' } })
  })
})

it('graphql operation does not allow mismatched operation response', () => {
  graphql.operation<{ key: string }>(() => {
    return HttpResponse.json({
      // @ts-expect-error Response data doesn't match the query type.
      data: {},
    })
  })
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
})

it('supports Response.error()', () => {
  graphql.query<{ id: string }>('GetUser', () => HttpResponse.error())
  graphql.mutation('UpdatePost', () => HttpResponse.error())
  graphql.operation(() => HttpResponse.error())

  graphql.query('GetUser', async () => HttpResponse.error())
  graphql.query('GetUser', function* () {
    return HttpResponse.error()
  })

  graphql.query('GetUser', () => Response.error())
  graphql.query('GetUser', async () => Response.error())
  graphql.query('GetUser', function* () {
    return Response.error()
  })
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

it('graphql query cannot extract variable and response types', () => {
  const getUserById = parse(`
      query GetUserById($userId: String!) {
        user(id: $userId) {
          firstName
        }
      }
      `)
  graphql.query(getUserById, ({ variables }) => {
    // Cannot extract variables type from a DocumentNode.
    expectTypeOf(variables).toEqualTypeOf<Record<string, any>>()

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

it('graphql mutation cannot extract variable and response types', () => {
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

it('graphql query allows extensions in the response body', () => {
  graphql.query<{ id: string }>('GetUser', () => {
    return HttpResponse.json({
      data: { id: '2' },
      extensions: {
        requestId: '3',
        runtime: 'foo',
      },
    })
  })
})

it('supports a "finalize" function', () => {
  graphql.query('GetUser', ({ finalize }) => {
    expectTypeOf(finalize).toEqualTypeOf<
      (callback: () => Promise<void> | void) => void
    >()
  })
})

it('graphql subscription is only available on a link', () => {
  graphql
    .link('ws://localhost/graphql')
    .subscription('OnCommentAdded', () => {})

  // Subscriptions require a concrete endpoint, so they are not
  // exposed on the root "graphql" namespace.
  // @ts-expect-error Property "subscription" does not exist.
  graphql.subscription('OnCommentAdded', () => {})
})

it('graphql subscription accepts string, RegExp, and DocumentNode names', () => {
  const api = graphql.link('ws://localhost/graphql')

  api.subscription('OnCommentAdded', () => {})
  api.subscription(/OnComment/, () => {})
  api.subscription(
    parse(`
      subscription OnCommentAdded {
        commentAdded {
          text
        }
      }
    `),
    () => {},
  )

  // Unlike queries and mutations, subscriptions do not
  // support custom predicate functions.
  api.subscription(
    // @ts-expect-error A custom predicate is not a valid subscription name.
    () => true,
    () => {},
  )
})

it('graphql subscription exposes the resolver info', () => {
  graphql
    .link('ws://localhost/:service')
    .subscription('OnCommentAdded', (info) => {
      expectTypeOf(info.operationName).toEqualTypeOf<string>()
      expectTypeOf(info.params).toEqualTypeOf<PathParams>()
      expectTypeOf(info.subscription).toEqualTypeOf<GraphQLSubscription>()
      expectTypeOf(info.finalize).toEqualTypeOf<
        (callback: () => Promise<void> | void) => void
      >()
    })
})

it('graphql subscription accepts inline generic variables type', () => {
  graphql
    .link('ws://localhost/graphql')
    .subscription<never, { postId: string }>(
      'OnCommentAdded',
      ({ subscription }) => {
        expectTypeOf(subscription.variables).toEqualTypeOf<{
          postId: string
        }>()
        expectTypeOf(subscription.query).toEqualTypeOf<string>()
        expectTypeOf(subscription.id).toEqualTypeOf<string>()
      },
    )
})

it("graphql subscription does not accept null as variables' generic type", () => {
  graphql.link('ws://localhost/graphql').subscription<
    { key: string },
    // @ts-expect-error `null` is not a valid variables type.
    null
  >('OnCommentAdded', () => {})
})

it('graphql subscription publishes a payload matching the query type', () => {
  graphql
    .link('ws://localhost/graphql')
    .subscription<{ commentAdded: { text: string } }>(
      'OnCommentAdded',
      ({ subscription }) => {
        subscription.publish({
          data: { commentAdded: { text: 'hello' } },
        })

        // Explicit null must be allowed.
        subscription.publish({ data: null })

        subscription.publish({
          data: { commentAdded: { text: 'hello' } },
          extensions: { requestId: 'abc-123' },
        })

        subscription.publish({
          // @ts-expect-error Published data doesn't match the query type.
          data: { commentAdded: { text: 123 } },
        })

        subscription.publish({
          // @ts-expect-error Published data doesn't match the query type.
          data: {},
        })
      },
    )
})

it('graphql subscription publishes from an iterable of the query type', async () => {
  graphql
    .link('ws://localhost/graphql')
    .subscription<{ commentAdded: { text: string } }>(
      'OnCommentAdded',
      async ({ subscription }) => {
        expectTypeOf(subscription.from).returns.toEqualTypeOf<Promise<void>>()

        await subscription.from([{ commentAdded: { text: 'hello' } }])

        await subscription.from(
          (async function* () {
            yield { commentAdded: { text: 'hello' } }
          })(),
        )

        // @ts-expect-error Published data doesn't match the query type.
        await subscription.from([{ commentAdded: { text: 123 } }])
      },
    )
})

it('graphql subscription terminates with errors and completes', () => {
  graphql
    .link('ws://localhost/graphql')
    .subscription('OnCommentAdded', ({ subscription }) => {
      subscription.error([{ message: 'Something went wrong' }])

      // Partial "GraphQLError" objects are allowed.
      subscription.error([{ message: 'Oops', path: ['commentAdded'] }])

      // @ts-expect-error Errors must be a list.
      subscription.error({ message: 'Something went wrong' })

      expectTypeOf(subscription.complete).toEqualTypeOf<() => void>()
    })
})

it('graphql subscription infers types from a TypedDocumentNode', () => {
  graphql
    .link('ws://localhost/graphql')
    .subscription(
      createTypedDocumentNode<
        { commentAdded: { text: string } },
        { postId: string }
      >(''),
      ({ subscription }) => {
        expectTypeOf(subscription.variables).toEqualTypeOf<{ postId: string }>()

        subscription.publish({
          data: { commentAdded: { text: 'hello' } },
        })

        subscription.publish({
          // @ts-expect-error Published data doesn't match the document type.
          data: { commentAdded: { text: 123 } },
        })
      },
    )
})

it('graphql subscription infers types from a TypedDocumentString', () => {
  graphql
    .link('ws://localhost/graphql')
    .subscription(
      createTypedDocumentString<
        { commentAdded: { text: string } },
        { postId: string }
      >(''),
      ({ subscription }) => {
        expectTypeOf(subscription.variables).toEqualTypeOf<{ postId: string }>()

        subscription.publish({
          data: { commentAdded: { text: 'hello' } },
        })

        subscription.publish({
          // @ts-expect-error Published data doesn't match the document type.
          data: { commentAdded: { text: 123 } },
        })
      },
    )
})

it('graphql subscription accepts handler options', () => {
  const api = graphql.link('ws://localhost/graphql')

  api.subscription('OnCommentAdded', () => {}, { once: true })

  // @ts-expect-error Unknown handler option.
  api.subscription('OnCommentAdded', () => {}, { unknownOption: true })
})

it('graphql subscription supports passthrough', () => {
  graphql
    .link('ws://localhost/graphql')
    .subscription('OnCommentAdded', ({ subscription }) => {
      const original = subscription.passthrough()
      expectTypeOf(original).toEqualTypeOf<GraphQLPassthroughSubscription>()

      original.addEventListener('next', (event) => {
        expectTypeOf(event.data.type).toEqualTypeOf<'next'>()
        expectTypeOf(event.data.id).toEqualTypeOf<string>()
        expectTypeOf(
          event.data.payload,
        ).toEqualTypeOf<GraphQLSubscriptionPayload>()
      })
      original.addEventListener('complete', () => {})
      original.addEventListener('error', () => {})
      original.addEventListener('connection_ack', () => {})

      // @ts-expect-error Unknown passthrough subscription event.
      original.addEventListener('unknown', () => {})
    })
})
