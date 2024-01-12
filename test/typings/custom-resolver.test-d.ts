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
  // @ts-expect-error Response body doesn't match the response type.
  withDelay(250, ({ params }) => {
    params.id.toUpperCase()
    // @ts-expect-error Unknown path parameter.
    params.nonexistent

    return HttpResponse.text('non-matching')
  }),
)

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

graphql.query<{ number: number }, { id: string }>(
  'GetUser',
  identityGraphQLResolver(({ variables }) => {
    variables.id.toUpperCase()

    return HttpResponse.json({
      data: {
        number: 1,
      },
    })
  }),
)

graphql.query<{ number: number }, { id: string }>(
  'GetUser',
  // @ts-expect-error Incompatible response query type.
  identityGraphQLResolver(({ variables }) => {
    // @ts-expect-error Unknown variable.
    variables.nonexistent

    return HttpResponse.json({
      data: {
        user: {
          id: variables.id,
        },
      },
    })
  }),
)
