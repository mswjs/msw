import { http, HttpResponse, passthrough } from 'msw'
import { it, describe, expectTypeOf } from 'vitest'

describe('http handlers', () => {
  it('supports path parameters', () => {
    http.get<{ id: string }>('/user/:id', ({ params }) => {
      params.id.toUpperCase()

      expectTypeOf(params).toEqualTypeOf<{ id: string }>()
    })
  })

  it('supports multiple path parameters', () => {
    http.get<{ a: string; b: string[] }>('/user/:a/:b/:b', ({ params }) => {
      params.a.toUpperCase()
      params.b.map((x) => x)

      expectTypeOf(params).toEqualTypeOf<{ a: string; b: string[] }>()
    })
  })

  it('supports path parameters declaration via type', () => {
    type UserPathParams = { id: string }
    http.get<UserPathParams>('/user/:id', ({ params }) => {
      params.id.toUpperCase()

      expectTypeOf(params).toEqualTypeOf<UserPathParams>()
    })
  })

  it('supports path parameters declaration via interface', () => {
    interface PostPathParameters {
      id: string
    }
    http.get<PostPathParameters>('/user/:id', ({ params }) => {
      params.id.toUpperCase()

      expectTypeOf(params).toEqualTypeOf<PostPathParameters>()
    })
  })

  it('supports request body generic', () => {
    http.post<never, { id: string }>('/user', async ({ request }) => {
      const data = await request.json()

      expectTypeOf(data).toEqualTypeOf<{ id: string }>()

      const text = await request.text()
      expectTypeOf(text).toEqualTypeOf<string>()
      text.toUpperCase()
      expectTypeOf(text).toEqualTypeOf<string>()
    })
  })

  it('supports response body null generic', () => {
    http.get<never, null>('/user', async ({ request }) => {
      const data = await request.json()
      expectTypeOf(data).toEqualTypeOf<null>()
    })
  })

  it('supports plain Response with no generic', () => {
    http.get('/user', () => {
      return new Response('hello')
    })
  })

  it('supports explicit response data', () => {
    http.get<never, never, { id: number }>('/user', () => {
      return HttpResponse.json({ id: 1 })
    })
  })

  it('supports explicit response data declared via type', () => {
    type ResponseBodyType = { id: number }
    http.get<never, never, ResponseBodyType>('/user', () => {
      const data: ResponseBodyType = { id: 1 }
      return HttpResponse.json(data)
    })
  })

  it('supports explicit response data declared via interface', () => {
    interface ResponseBodyInterface {
      id: number
    }
    http.get<never, never, ResponseBodyInterface>('/user', () => {
      const data: ResponseBodyInterface = { id: 1 }
      return HttpResponse.json(data)
    })
  })

  it('accepts correct type for HttpResponse', () => {
    http.get<never, never, { id: number }>(
      '/user',
      // @ts-expect-error String not assignable to number
      () => HttpResponse.json({ id: 'invalid' }),
    )
  })

  it("does not accept missing property in HttpResponse's body", () => {
    http.get<never, never, { id: number }>(
      '/user',
      // @ts-expect-error Missing property "id"
      () => HttpResponse.json({}),
    )
  })

  it("accepts narrower type in HttpResponse's body", () => {
    http.get<never, never, string | string[]>('/user', () =>
      HttpResponse.json(['value']),
    )
  })

  it("accepts more specific type in HttpResponse's body", () => {
    http.get<never, never, { label: boolean }>('/user', () =>
      HttpResponse.json({ label: true }),
    )
  })

  it("accepts passthrough in HttpResponse's body", () => {
    // Passthrough responses.
    http.all('/', () => passthrough())
    http.get('/', () => passthrough())
    http.get<never, never, { id: number }>('/', ({ request }) => {
      if (request.headers.has('cookie')) {
        return passthrough()
      }

      return HttpResponse.json({ id: 1 })
    })
  })
})
