import { it, expectTypeOf } from 'vitest'
import {
  http,
  HttpResponseResolver,
  delay,
  PathParams,
  DefaultBodyType,
  HttpResponse,
  graphql,
  GraphQLQuery,
  GraphQLVariables,
  GraphQLResponseResolver,
} from 'msw'

it('custom http resolver has correct parameters type', () => {
  /**
   * A higher-order resolver that injects a fixed
   * delay before calling the provided resolver.
   */
  function withDelay<
    // Recreate the generic signature of the default resolver
    // so the arguments passed to "http.get" propagate here.
    Params extends PathParams,
    RequestBodyType extends DefaultBodyType,
    ResponseBodyType extends DefaultBodyType,
  >(
    delayMs: number,
    resolver: HttpResponseResolver<Params, RequestBodyType, ResponseBodyType>,
  ): HttpResponseResolver<Params, RequestBodyType, ResponseBodyType> {
    return async (...args) => {
      await delay(delayMs)
      return resolver(...args)
    }
  }

  http.get<{ id: string }, never, 'hello'>(
    '/user/:id',
    withDelay(250, ({ params }) => {
      expectTypeOf(params).toEqualTypeOf<{ id: string }>()
      return HttpResponse.text(
        // @ts-expect-error Response body doesn't match the response type.
        'non-matching',
      )
    }),
  )
})

function identityGraphQLResolver<
  Query extends GraphQLQuery,
  Variables extends GraphQLVariables,
>(
  resolver: GraphQLResponseResolver<Query, Variables>,
): GraphQLResponseResolver<Query, Variables> {
  return async (...args) => {
    return resolver(...args)
  }
}

it('custom graphql resolver has correct variables and response type', () => {
  graphql.query<{ number: number }, { id: string }>(
    'GetUser',
    identityGraphQLResolver(({ variables }) => {
      expectTypeOf(variables).toEqualTypeOf<{ id: string }>()

      return HttpResponse.json({
        data: {
          number: 1,
        },
      })
    }),
  )
})

it('custom graphql resolver does not accept unknown variables', () => {
  graphql.query<{ number: number }, { id: string }>(
    'GetUser',
    identityGraphQLResolver(({ variables }) => {
      expectTypeOf(variables).toEqualTypeOf<{ id: string }>()

      return HttpResponse.json({
        data: {
          // @ts-expect-error Incompatible response query type.
          user: {
            id: variables.id,
          },
        },
      })
    }),
  )
})
