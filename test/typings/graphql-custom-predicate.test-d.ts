import {
  graphql,
  type GraphQLOperationType,
  type GraphQLVariables,
  type GraphQLResponseResolver,
} from 'msw'

const resolver: GraphQLResponseResolver<any, any> = () => void 0

it('supports custom predicate', () => {
  graphql.query<{ user: null }, { a: string }>(
    ({ request, cookies, operationType, operationName, query, variables }) => {
      expectTypeOf(request).toEqualTypeOf<Request>()
      expectTypeOf(cookies).toEqualTypeOf<Record<string, string>>()
      expectTypeOf(operationType).toEqualTypeOf<GraphQLOperationType>
      expectTypeOf(operationName).toEqualTypeOf<string>()
      /**
       * @note Both query and variables do not infer the narrow type from the handler
       * because this is the matching phase and values might be arbitrary.
       */
      expectTypeOf(query).toEqualTypeOf<string>()
      expectTypeOf(variables).toEqualTypeOf<GraphQLVariables>()

      return operationName === 'MyQuery'
    },
    resolver,
  )

  graphql.query(() => true, resolver)
  graphql.query(() => false, resolver)
  graphql.query(
    // @ts-expect-error Invalid return type.
    () => {},
    resolver,
  )
  graphql.query(
    // @ts-expect-error Invalid return type.
    () => ({}),
    resolver,
  )
  graphql.query(
    // @ts-expect-error Invalid return type.
    () => undefined,
    resolver,
  )
  graphql.query(
    // @ts-expect-error Invalid return type.
    () => null,
    resolver,
  )
})

it('supports returning extended match result from a custom predicate', () => {
  graphql.query(() => ({ matches: true }), resolver)
  graphql.query(() => ({ matches: false }), resolver)

  graphql.query(
    // @ts-expect-error Invalid return type.
    () => ({ matches: 2 }),
    resolver,
  )
  graphql.query(
    // @ts-expect-error Invalid return type.
    () => ({ matches: undefined }),
    resolver,
  )
  graphql.query(
    // @ts-expect-error Invalid return type.
    () => ({ matches: null }),
    resolver,
  )
})
