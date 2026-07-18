import {
  graphql,
  type GraphQLOperationType,
  type GraphQLVariables,
  type GraphQLResponseResolver,
} from 'msw/graphql'

const api = graphql.link('https://api.example.com/graphql')

const resolver: GraphQLResponseResolver<any, any> = () => void 0

it('supports custom predicate', () => {
  api.query<{ user: null }, { a: string }>(
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

  api.query(() => true, resolver)
  api.query(() => false, resolver)
  api.query(
    // @ts-expect-error Invalid return type.
    () => {},
    resolver,
  )
  api.query(
    // @ts-expect-error Invalid return type.
    () => ({}),
    resolver,
  )
  api.query(
    // @ts-expect-error Invalid return type.
    () => undefined,
    resolver,
  )
  api.query(
    // @ts-expect-error Invalid return type.
    () => null,
    resolver,
  )
})

it('supports returning extended match result from a custom predicate', () => {
  api.query(() => ({ matches: true }), resolver)
  api.query(() => ({ matches: false }), resolver)

  api.query(
    // @ts-expect-error Invalid return type.
    () => ({ matches: 2 }),
    resolver,
  )
  api.query(
    // @ts-expect-error Invalid return type.
    () => ({ matches: undefined }),
    resolver,
  )
  api.query(
    // @ts-expect-error Invalid return type.
    () => ({ matches: null }),
    resolver,
  )
})
