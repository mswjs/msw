import { test, expectTypeOf } from 'vitest'
import { http, HttpResponse, passthrough } from 'msw'

test('supports a single path parameter', () => {
  http.get<{ id: string }>('/user/:id', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<{ id: string }>()
  })
})

test('supports a repeating path parameter', () => {
  http.get<{ id?: string }>('/user/id*', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<{ id?: string }>()
  })
})

test('supports an optional path parameter', () => {
  http.get<{ id?: string }>('/user/:id?', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<{ id?: string }>()
  })
})

test('supports optional repeating path parameter', () => {
  /**
   * @note This is the newest "path-to-regexp" syntax.
   * MSW doesn't support this quite yet.
   */
  http.get<{ path?: string[] }>('/user{/*path}', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<{ path?: string[] }>()
  })
})

test('supports multiple path parameters', () => {
  type Params = { a: string; b: string[] }
  http.get<Params>('/user/:a/:b/:b', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<Params>()
  })
})

test('supports path parameters declared via type', () => {
  type Params = { id: string }
  http.get<Params>('/user/:id', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<Params>()
  })
})

test('supports path parameters declared via interface', () => {
  interface PostPathParameters {
    id: string
  }
  http.get<PostPathParameters>('/user/:id', ({ params }) => {
    expectTypeOf(params).toEqualTypeOf<PostPathParameters>()
  })
})

test('supports json as a request body type argument', () => {
  http.post<never, { id: string }>('/user', async ({ request }) => {
    const data = await request.json()

    expectTypeOf(data).toEqualTypeOf<{ id: string }>()

    const text = await request.text()
    expectTypeOf(text).toEqualTypeOf<string>()
    expectTypeOf(text).toEqualTypeOf<string>()
  })
})

test('supports null as the request body type argument', () => {
  http.get<never, null>('/user', async ({ request }) => {
    const data = await request.json()
    expectTypeOf(data).toEqualTypeOf<null>()
  })
})

test('returns the same request type when cloning', () => {
  http.post<never, { id: string }>('/user', async ({ request }) => {
    const data = await request.clone().json()

    expectTypeOf(data).toEqualTypeOf<{ id: string }>()
  })

  http.post<never, null>('/user', async ({ request }) => {
    const data = await request.clone().json()

    expectTypeOf(data).toEqualTypeOf<null>()
  })
})

test('returns plain Response without explicit response body type argument', () => {
  http.get('/user', () => {
    return new Response('hello')
  })
})

test('supports a text response without explicit response body type argument', () => {
  http.get('/resource', () => {
    return HttpResponse.text('hello world')
  })
})

test('supports a json response without explicit response body type argument', () => {
  http.get('/resource', () => {
    return HttpResponse.json({ id: 1 })
  })
})

test('supports an xml response without explicit response body type argument', () => {
  http.get('/resource', () => {
    return HttpResponse.xml('<hello>world</hello>')
  })
})

test('supports a form data response without explicit response body type argument', () => {
  http.get('/resource', () => {
    return HttpResponse.formData(new FormData())
  })
})

test('supports a stream response without explicit response body type argument', () => {
  http.get('/resource', () => {
    return new HttpResponse(new ReadableStream())
  })
})

test('returns HttpResponse with URLSearchParams as response body', () => {
  http.get('/', () => {
    return new HttpResponse(new URLSearchParams())
  })
})

test('returns HttpResponse with FormData as response body', () => {
  http.get('/', () => {
    return new HttpResponse(new FormData())
  })
})

test('returns HttpResponse with ReadableStream as response body', () => {
  http.get('/', () => {
    return new HttpResponse(new ReadableStream())
  })
})

test('returns HttpResponse with Blob as response body', () => {
  http.get('/', () => {
    return new HttpResponse(new Blob(['hello']))
  })
})

test('returns HttpResponse with ArrayBuffer as response body', () => {
  http.get('/', () => {
    return new HttpResponse(new ArrayBuffer(5))
  })
})

test('supports HttpResponse.arrayBuffer shorthand method', () => {
  http.get('/', () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(5))
  })

  http.get('/', async () => {
    return HttpResponse.arrayBuffer(
      await fetch('/image').then((response) => response.arrayBuffer()),
    )
  })

  http.get<never, never, ArrayBuffer>('/', () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(5))
  })
})

test('supports null as a response body type argument', () => {
  http.get<never, never, null>('/', () => {
    return new HttpResponse()
  })
  http.get<never, never, null>('/', () => {
    return new HttpResponse(
      // @ts-expect-error Expected null, got a string.
      'hello',
    )
  })
  http.get<never, never, null>('/', () => {
    return HttpResponse.json(
      // @ts-expect-error Expected null, got an object.
      { id: 1 },
    )
  })
})

test('supports string as a response body type argument', () => {
  http.get<never, never, string>('/', ({ request }) => {
    if (request.headers.has('x-foo')) {
      return HttpResponse.text('conditional')
    }

    return HttpResponse.text('hello')
  })
})

test('supports exact string as a response body type argument', () => {
  http.get<never, never, 'hello'>('/', () => {
    return HttpResponse.text('hello')
  })

  http.get<never, never, 'hello'>('/', () => {
    // @ts-expect-error Non-matching response body type.
    return HttpResponse.text('unexpected')
  })
})

test('supports object as a response body type argument', () => {
  http.get<never, never, { id: number }>('/user', () => {
    return HttpResponse.json({ id: 1 })
  })
})

test('supports narrow object as a response body type argument', () => {
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

test('supports object with extra keys as a response body type argument', () => {
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

test('forbids a plain fetch response for a non-object response body type', () => {
  http.get<never, never, string>(
    '/user',
    // @ts-expect-error Plain Response is not assignable to a strict body type.
    () => new Response('hello'),
  )

  http.get<never, never, 'hello'>(
    '/user',
    // @ts-expect-error Plain Response is not assignable to a strict body type.
    () => new Response('hello'),
  )

  http.get<never, never, null>(
    '/user',
    // @ts-expect-error Plain Response is not assignable to a strict body type.
    () => new Response(null),
  )
})

test('supports response body type argument declared via type', () => {
  type ResponseBodyType = { id: number }
  http.get<never, never, ResponseBodyType>('/user', () => {
    const data: ResponseBodyType = { id: 1 }
    return HttpResponse.json(data)
  })
})

test('supports response body type argument declared via interface', () => {
  interface ResponseBodyInterface {
    id: number
  }
  http.get<never, never, ResponseBodyInterface>('/user', () => {
    const data: ResponseBodyInterface = { id: 1 }
    return HttpResponse.json(data)
  })
})

test('throws when returning a json response not matching the response body type argument', () => {
  http.get<never, never, { id: number }>(
    '/user',
    // @ts-expect-error String not assignable to number
    () => HttpResponse.json({ id: 'invalid' }),
  )
})

test('throws when returning an empty json response not matching the response body type argument', () => {
  http.get<never, never, { id: number }>(
    '/user',
    // @ts-expect-error Missing property "id"
    () => HttpResponse.json({}),
  )
})

test('accepts narrower type for response body', () => {
  http.get<never, never, string | string[]>('/user', () =>
    HttpResponse.json(['value']),
  )
})

test('accepts more specific type for response body', () => {
  http.get<never, never, { label: boolean }>('/user', () =>
    HttpResponse.json({ label: true }),
  )
})

test("accepts passthrough in HttpResponse's body", () => {
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

test('infers a narrower json response type', () => {
  type ResponseBody = {
    a: number
  }

  http.get<never, never, ResponseBody>('/', () => {
    // @ts-expect-error Unknown property "b".
    return HttpResponse.json({ a: 1, b: 2 })
  })
})

test('errors when returning non-Response data from resolver', () => {
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

test('treats non-typed HttpResponse body type as matching', () => {
  http.get<never, never, { id: string }>('/resource', () => {
    /**
     * @note When constructing a Response/HttpResponse instance,
     * its body type must effectively be treated as `any`. You
     * cannot provide or infer a narrower type because these classes
     * operate on streams or strings, none of which are type-safe.
     */
    return new HttpResponse(null, { status: 500 })
  })
})

test('supports returning Response.error()', () => {
  http.get('/resource', () => Response.error())
  http.get('/resource', async () => Response.error())
  http.get('/resource', function* () {
    return Response.error()
  })

  http.get<never, never, string>('/resource', () => HttpResponse.error())
  http.get<never, never, string>('/resource', async () => HttpResponse.error())
  http.get<never, never, string>('/resource', function* () {
    return HttpResponse.error()
  })
})

test('supports a "finalize" function', () => {
  http.get('/resource', ({ finalize }) => {
    expectTypeOf(finalize).toEqualTypeOf<
      (callback: () => Promise<void> | void) => void
    >()
  })
})
