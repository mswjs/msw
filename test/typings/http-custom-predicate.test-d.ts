import { http, HttpResponseResolver } from 'msw'

const resolver: HttpResponseResolver<any, any, any> = () => void 0

it('supports custom predicate', () => {
  http.get(({ request, cookies }) => {
    expectTypeOf(request).toEqualTypeOf<Request>()
    expectTypeOf(cookies).toEqualTypeOf<Record<string, string>>()

    return request.url.includes('user')
  }, resolver)

  http.get(() => true, resolver)
  http.get(() => false, resolver)
  // @ts-expect-error Invalid return type.
  http.get(() => {}, resolver)
  // @ts-expect-error Invalid return type.
  http.get(() => ({}), resolver)
  // @ts-expect-error Invalid return type.
  http.get(() => undefined, resolver)
  // @ts-expect-error Invalid return type.
  http.get(() => null, resolver)
})

it('supports returning path parameters from the custom predicate', () => {
  // Implicit path parameters type.
  http.get(
    () => ({
      matches: true,
      params: { user: 'hello' },
    }),
    ({ params }) => {
      expectTypeOf(params).toEqualTypeOf<{ user: string }>()
    },
  )

  // Explicit path parameters type.
  http.get<{ inferred: string }>(
    () => ({
      matches: true,
      params: { inferred: '1' },
    }),
    ({ params }) => {
      expectTypeOf(params).toEqualTypeOf<{ inferred: string }>()
    },
  )
})

it('supports returning extended match result from a custom predicate', () => {
  http.get(() => ({ matches: true, params: {} }), resolver)
  http.get(() => ({ matches: false, params: {} }), resolver)

  // @ts-expect-error Invalid return type.
  http.get(() => ({ matches: true }), resolver)
  // @ts-expect-error Invalid return type.
  http.get(() => ({ params: {} }), resolver)
})
