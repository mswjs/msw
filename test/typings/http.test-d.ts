import { it, expectTypeOf } from 'vitest'
import { http, HttpResponse, passthrough } from 'msw'

it('supports a single path parameter', () => {
  http.get<{ id: string }>('/user/:id', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<{ id: string }>()
  })
})

it('supports a repeating path parameter', () => {
  http.get<{ id?: string }>('/user/id*', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<{ id?: string }>()
  })
})

it('supports an optional path parameter', () => {
  http.get<{ id?: string }>('/user/:id?', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<{ id?: string }>()
  })
})

it('supports optional repeating path parameter', () => {
  /**
   * @note This is the newest "path-to-regexp" syntax.
   * MSW doesn't support this quite yet.
   */
  http.get<{ path?: string[] }>('/user{/*path}', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<{ path?: string[] }>()
  })
})

it('supports multiple path parameters', () => {
  type Params = { a: string; b: string[] }
  http.get<Params>('/user/:a/:b/:b', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<Params>()
  })
})

it('supports path parameters declared via type', () => {
  type Params = { id: string }
  http.get<Params>('/user/:id', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<Params>()
  })
})

it('supports path parameters declared via interface', () => {
  interface PostPathParameters {
    id: string
  }
  http.get<PostPathParameters>('/user/:id', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<PostPathParameters>()
  })
})

it('supports json as a request body generic argument', () => {
  http.post<never, { id: string }>('/user', async ({ request }) => {
    const data = await request.json()

    expectTypeOf(data).toEqualTypeOf<{ id: string }>()

    const text = await request.text()
    expectTypeOf(text).toEqualTypeOf<string>()
    expectTypeOf(text).toEqualTypeOf<string>()
  })
})

it('supports null as the request body generic', () => {
  http.get<never, null>('/user', async ({ request }) => {
    const data = await request.json()
    expectTypeOf(data).toEqualTypeOf<null>()
  })
})

it('returns plain Response withouth explicit response body generic', () => {
  http.get('/user', () => {
    return new Response('hello')
  })
})

it('supports string as a response body generic argument', () => {
  http.get<never, never, string>('/', ({ request }) => {
    if (request.headers.has('x-foo')) {
      return HttpResponse.text('conditional')
    }

    return HttpResponse.text('hello')
  })
})

it('supports exact string as a response body generic argument', () => {
  http.get<never, never, 'hello'>('/', () => {
    return HttpResponse.text('hello')
  })

  http.get<never, never, 'hello'>('/', () => {
    // @ts-expect-error Non-matching response body type.
    return HttpResponse.text('unexpected')
  })
})

it('supports object as a response body generic argument', () => {
  http.get<never, never, { id: number }>('/user', () => {
    return HttpResponse.json({ id: 1 })
  })
})

it('supports narrow object as a response body generic argument', () => {
  http.get<never, never, { id: 123 }>('/user', () => {
    return HttpResponse.json({ id: 123 })
  })

  http.get<never, never, { id: 123 }>('/user', () => {
    return HttpResponse.json({
      // @ts-expect-error Non-matching response body type.
      id: 456,
    })
  })
})

it('supports object with extra keys as a response body generic argument', () => {
  type ResponseBody = {
    [key: string]: number | string
    id: 123
  }

  http.get<never, never, ResponseBody>('/user', () => {
    return HttpResponse.json({
      id: 123,
      // Extra keys are allowed if they satisfy the index signature.
      name: 'John',
    })
  })

  http.get<never, never, ResponseBody>('/user', () => {
    return HttpResponse.json({
      // @ts-expect-error Must be 123.
      id: 456,
      name: 'John',
    })
  })

  http.get<never, never, ResponseBody>('/user', () => {
    return HttpResponse.json({
      id: 123,
      // @ts-expect-error Must satisfy the index signature.
      name: { a: 1 },
    })
  })
})

it('supports response body generic declared via type', () => {
  type ResponseBodyType = { id: number }
  http.get<never, never, ResponseBodyType>('/user', () => {
    const data: ResponseBodyType = { id: 1 }
    return HttpResponse.json(data)
  })
})

it('supports response body generic declared via interface', () => {
  interface ResponseBodyInterface {
    id: number
  }
  http.get<never, never, ResponseBodyInterface>('/user', () => {
    const data: ResponseBodyInterface = { id: 1 }
    return HttpResponse.json(data)
  })
})

it('throws when returning a json response not matching the response body generic', () => {
  http.get<never, never, { id: number }>(
    '/user',
    // @ts-expect-error String not assignable to number
    () => HttpResponse.json({ id: 'invalid' }),
  )
})

it('throws when returning an empty json response not matching the response body generic', () => {
  http.get<never, never, { id: number }>(
    '/user',
    // @ts-expect-error Missing property "id"
    () => HttpResponse.json({}),
  )
})

it('accepts narrower type for response body', () => {
  http.get<never, never, string | string[]>('/user', () =>
    HttpResponse.json(['value']),
  )
})

it('accepts more specific type for response body', () => {
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

it('infers a narrower json response type', () => {
  type ResponseBody = {
    a: number
  }

  http.get<never, never, ResponseBody>('/', () => {
    // @ts-expect-error Unknown property "b".
    return HttpResponse.json({ a: 1, b: 2 })
  })
})

it('errors when returning non-Response data from resolver', () => {
  http.get(
    '/resource',
    // @ts-expect-error
    () => 123,
  )
  http.get(
    '/resource',
    // @ts-expect-error
    () => 'foo',
  )
  http.get(
    '/resource',
    // @ts-expect-error
    () => ({}),
  )
})
