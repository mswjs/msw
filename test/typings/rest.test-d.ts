import { http, HttpResponse } from 'msw'

/**
 * Request path parameters.
 */
http.get<{ id: string }>('/user/:id', ({ params }) => {
  params.id.toUpperCase()

  // @ts-expect-error Unknown path parameter
  params.unknown
})

http.get<{ a: string; b: string[] }>('/user/:a/:b/:b', ({ params }) => {
  params.a.toUpperCase()
  params.b.map((x) => x)

  // @ts-expect-error Unknown path parameter
  params.unknown
})

// Supports path parameters declaration via type.
type UserPathParams = { id: string }
http.get<UserPathParams>('/user/:id', ({ params }) => {
  params.id.toUpperCase()

  // @ts-expect-error Unknown path parameter
  params.unknown
})

// Supports path parameters declaration via interface.
interface PostPathParameters {
  id: string
}
http.get<PostPathParameters>('/user/:id', ({ params }) => {
  params.id.toUpperCase()

  // @ts-expect-error Unknown path parameter
  params.unknown
})

http.get<never>('/user/:a/:b', ({ params }) => {
  // @ts-expect-error Unknown path parameter
  params.a.toUpperCase()
  // @ts-expect-error Unknown path parameter
  params.b.map((x) => x)
})

/**
 * Request body generic.
 */
http.post<never, { id: string }>('/user', async ({ request }) => {
  const data = await request.json()
  data.id

  // @ts-expect-error Unknown property
  data.unknown

  const text = await request.text()
  text.toUpperCase()
  // @ts-expect-error Text remains plain text.
  text.id
})

http.get<never, null>('/user', async ({ request }) => {
  const data = await request.json()
  // @ts-expect-error Null is not an object
  Object.keys(data)
})

/**
 * Response body generic.
 */
http.get('/user', () => {
  // Allows responding with a plain Response
  // when no response body generic is set.
  return new Response('hello')
})

http.get<never, never, { id: number }>('/user', () => {
  return HttpResponse.json({ id: 1 })
})

// Supports explicit response data declared via type.
type ResponseBodyType = { id: number }
http.get<never, never, ResponseBodyType>('/user', () => {
  const data: ResponseBodyType = { id: 1 }
  return HttpResponse.json(data)
})

// Supports explicit response data declared via interface.
interface ResponseBodyInterface {
  id: number
}
http.get<never, never, ResponseBodyInterface>('/user', () => {
  const data: ResponseBodyInterface = { id: 1 }
  return HttpResponse.json(data)
})

http.get<never, never, { id: number }>(
  '/user',
  // @ts-expect-error String not assignable to number
  () => HttpResponse.json({ id: 'invalid' }),
)

http.get<never, never, { id: number }>(
  '/user',
  // @ts-expect-error Missing property "id"
  () => HttpResponse.json({}),
)

// Response resolver can return a response body of a
// narrower type than defined in the generic.
http.get<never, never, string | string[]>('/user', () =>
  HttpResponse.json(['value']),
)

// Response resolver can return a more specific type
// than provided in the response generic.
http.get<never, never, { label: boolean }>('/user', () =>
  HttpResponse.json({ label: true }),
)

// Empty response body requires a strict response
http.get<never, never, null>(
  '/user',
  // @ts-expect-error HttpResponse is not StrictResponse<null>
  () => new HttpResponse(),
)

// Empty response can be used for en empty response body
http.get<never, never, null>('/user', () => HttpResponse.empty())
