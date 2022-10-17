import { rest, HttpResponse } from 'msw'

/**
 * Request path parameters.
 */
rest.get<{ id: string }>('/user/:id', ({ params }) => {
  params.id.toUpperCase()

  // @ts-expect-error Unknown path parameter
  params.unknown
})

rest.get<{ a: string; b: string[] }>('/user/:a/:b/:b', ({ params }) => {
  params.a.toUpperCase()
  params.b.map((x) => x)

  // @ts-expect-error Unknown path parameter
  params.unknown
})

// Supports path parameters declaration via type.
type UserPathParams = { id: string }
rest.get<UserPathParams>('/user/:id', ({ params }) => {
  params.id.toUpperCase()

  // @ts-expect-error Unknown path parameter
  params.unknown
})

// Supports path parameters declaration via interface.
interface PostPathParameters {
  id: string
}
rest.get<PostPathParameters>('/user/:id', ({ params }) => {
  params.id.toUpperCase()

  // @ts-expect-error Unknown path parameter
  params.unknown
})

rest.get<never>('/user/:a/:b', ({ params }) => {
  // @ts-expect-error Unknown path parameter
  params.a.toUpperCase()
  // @ts-expect-error Unknown path parameter
  params.b.map((x) => x)
})

/**
 * Request body generic.
 */
rest.post<never, { id: string }>('/user', async ({ request }) => {
  const data = await request.json()
  data.id

  // @ts-expect-error Unknown property
  data.unknown

  const text = await request.text()
  text.toUpperCase()
  // @ts-expect-error Text remains plain text.
  text.id
})

rest.get<never, null>('/user', async ({ request }) => {
  const data = await request.json()
  // @ts-expect-error Null is not an object
  Object.keys(data)
})

/**
 * Response body generic.
 */
rest.get<never, never, { id: number }>('/user', () => {
  return HttpResponse.json({ id: 1 })
})

rest.get<never, never, { id: number }>(
  '/user',
  // @ts-expect-error String not assignable to number
  () => HttpResponse.json({ id: 'invalid' }),
)

rest.get<never, never, { id: number }>(
  '/user',
  // @ts-expect-error Missing property "id"
  () => HttpResponse.json({}),
)

// Response resolver can return a response body of a
// narrower type than defined in the generic.
rest.get<never, never, string | string[]>('/user', () =>
  HttpResponse.json(['value']),
)

// Response resolver can return a more specific type
// than provided in the response generic.
rest.get<never, never, { label: boolean }>('/user', () =>
  HttpResponse.json({ label: true }),
)
