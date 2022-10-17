# Migration guide

## Response resolver

A response resolver now exposes a single object argument instead of `(req, res, ctx)`. That argument represents resolver information and consists of properties that are always present for all handler types and extra properties specific to handler types.

### Resolver info

#### General

- `request`, a Fetch API `Request` instance representing a captured request.
- `cookies`, a parsed cookies object based on the request cookies.

#### REST-specific

- `params`, an object of parsed path parameters.

#### GraphQL-specific

- `query`, a GraphQL query string extracted from either URL search parameters or a POST request body.
- `variables`, an object of GraphQL query variables.

### Using a new signature

To mock responses, you should now return a Fetch API `Response` instance from the response resolver. You no longer need to compose a response via `res()`, and all the context utilities have also [been removed](#context-utilities).

```js
rest.get('/greet/:name', ({ request, params }) => {
  console.log('Captured %s %s', request.method, request.url)
  return new Response(`hello, ${params.name}!`)
})
```

Now, a more complex example for both REST and GraphQL requests.

```js
import { rest, graphql } from 'msw'

export const handlers = [
  rest.put('/user/:id', async ({ request, params, cookies }) => {
    // Read request body as you'd normally do with Fetch.
    const payload = await request.json()
    // Access path parameters like before.
    const { id } = params
    // Access cookies like before.
    const { sessionId } = cookies

    return new Response(null, { status: 201 })
  }),

  graphql.mutation('CreateUser', ({ request, query, variables }) => {
    return new Response(
      JSON.stringify({
        data: {
          user: {
            id: 'abc-123',
            firstName: variables.firstName,
          },
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }),
]
```

### Request changes

Since the returned `request` is now an instance of Fetch API `Request`, there are some changes to its properties.

#### Request URL

The `request.url` property is a string (previously, a `URL` instance). If you wish to operate with it like a `URL`, you need to construct it manually:

```js
rest.get('/product', ({ request }) => {
  // For example, this is how you would access
  // request search parameters now.
  const url = new URL(request.url)
  const productId = url.searchParams.get('id')
})
```

#### Path parameters

Path parameters are now exposed directly on the [Resolver info](#resolver-info) object (previously, `req.params`).

#### Request cookies

Request cookies are now exposed directly on the [Resolver info](#resolver-info) object (previously, `req.cookies`).

#### Request body

The library now does no assumptions when reading the intercepted request's body (previously, `req.body`). Instead, you are in charge to read the request body as you see appropriate.

> Note that since the intercepted request is now represented by a Fetch API `Request` instance, its `request.body` property still exists but returns a `ReadableStream`.

For example, this is how you would read request body:

```js
rest.post('/user', async ({ request }) => {
  const nextUser = await request.json()
  // request.formData() / request.arrayBuffer() / etc.
})
```

### Convenient response declarations

Using the Fetch API `Response` instance may get quite verbose. To give you more convenient means of declaring mocked responses while remaining specification compliant and compatible, the library now exports an `HttpResponse` object. You can use that object to construct response instances faster.

```js
import { rest, HttpResponse } from 'msw'

export const handlers = [
  rest.get('/user', () => {
    // This is synonymous to "ctx.json()":
    // HttpResponse.json() stringifies the given body
    // and sets the correct "Content-Type" response header
    // to describe a JSON response body.
    return HttpResponse.json({ firstName: 'John' })
  }),
]
```

> Read more on how to use `HttpResponse` to mock [REST API](#rest-response-body-utilities) and [GraphQL API](#graphql-response-body-utilities) responses.

## Responses in Node.js

Although MSW now respects the Fetch API specification, the older versions of Node.js do not, so you can't construct a `Response` instance because there is no such global class.

To account for this, the library exports a `Response` class that you should use when declaring request handlers. Behind the hood, that response class is resolved to a compatible polyfill in Node.js; in the browser, it only aliases `global.Response` without introducing additional behaviors.

```js
import { rest, Response } from 'msw'

setupServer(
  rest.get('/ping', () => {
    return new Response('hello world)
  })
)
```

Relying on a single universal `Response` class will allow you to write request handlers that can run in both browser and Node.js environments.

## One-time responses

To create a one-time request handler, pass it an object as the third argument with `once: true` set:

```js
import { HttpResponse, rest } from 'msw'

export const handlers = [
  rest.get('/user', () => HttpResponse.text('hello'), { once: true }),
]
```

## Passthrough responses

```js
import { passthrough } from 'msw'

export const handlers = [
  rest.get('/user', () => {
    // Previously, "req.passthrough()".
    return passthrough()
  }),
]
```

---

## Context utilities

Most of the context utilities you'd normally use via `ctx.*` were removed. Instead, we encourage you to set respective properties directly on the response instance:

```js
import { HttpResponse, rest } from 'msw'

export const handlers = [
  rest.post('/user', () => {
    // ctx.json()
    return HttpResponse.json(
      { firstName: 'John' },
      {
        status: 201, // ctx.status()
        headers: {
          'X-Custom-Header': 'value', // ctx.set()
        },
      },
    )
  }),
]
```

### REST response body utilities

All response body utilities, like `ctx.body()`, `ctx.text()`, `ctx.json()`, etc., were removed in favor of constructing a correct `Response` instance. However, since `Response` declarations may get verbose, the library now exports a `HttpResponse` abstraction to help you construct mocked responses with different body types easier.

```js
import { HttpResponse, rest } from 'msw'

export const handlers = [
  rest.get('/body', () => {
    // You can construct mocked responses with
    // arbitrary bodies via a direct Response instance.
    return new Response('raw-body', {
      headers: {
        'Content-Type': 'application/vnd.acme+json',
      },
    })
  }),
  rest.get('/text', () => {
    return HttpResponse.text('hello world')
  }),
  rest.get('/json', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  rest.get('/xml', () => {
    return HttpResponse.xml({ firstName: 'John' })
  }),
]
```

> In addition, you can now mock other response bodies like `formData` or `blob` by accessing the respective methods on the `HttpResponse` object.

### GraphQL response body utilities

GraphQL context utilities have been removed in favor of constructing a correct JSON response instance.

```js
import { HttpResponse, graphql } from 'msw'

export const handlers = [
  graphql.query('GetUser', ({ variables }) => {
    return HttpResponse.json({
      data: {
        // ctx.data()
        user: {
          id: variables.id,
          firstName: 'John',
        },
      },
      // ctx.errors()
      errors: [
        {
          message: 'Failed to fetch "user.posts"',
        },
      ],
      extensions: {
        // ctx.extensions()
        server: 'HTTP1.1 Apache',
      },
    })
  }),
]
```

### `ctx.delay()`

You can delay a mocked response by awaiting the `delay()` function:

```js
import { rest, delay } from 'msw'

export const handlers = [
  rest.post('/user', async () => {
    await delay()
  }),
]
```

> The `delay()` function has the same call signature as the `ctx.delay()` used to have.

### `ctx.fetch()`

The `ctx.fetch()` function has been removed in favor of the `bypass()` function. You should now always perform a regular `fetch()` call and wrap the request in the `bypass()` function if you wish for it to ignore any otherwise matching request handlers.

```js
import { rest, bypass } from 'msw'

export const handlers = [
  rest.get('https://api.github.com/user/:username', async ({ request }) => {
    // Performs an original "GET" request to the GitHub REST API.
    const original = await fetch(bypass(request))
  }),
]
```

### `ctx.cookie()`

Please set the "Set-Cookie" response header in order to mock response cookies.

```js
import { HttpResponse, rest } from 'msw'

export const handlers = [
  rest.post('/login', () => {
    return HttpResponse.text(null, {
      headers: {
        'Set-Cookie': 'sessionId=abc123',
      },
    })
  }),
]
```

Since Fetch API Headers do not support multiple values as the `HeadersInit`, to mock a multi-value response cookie create a `Headers` instance and use the `.append()` method to set multiple `Set-Cookie` response headers.

```js
import { Headers, HttpResponse, rest } from 'msw'

rest.post('/login', () => {
  const headers = new Headers()
  headers.append('Set-Cookie', 'sessionId=123')
  headers.append('Set-Cookie', 'gtm=en_US')

  return HttpResponse.plain(null, { headers })
})
```

## Life-cycle events

The request and response instances exposed in the life-cycle API have also been updated to return Fetch API `Request` and `Response` respectively.

The request ID is now exposed as a standalone argument (previously, `req.id`).

```js
server.events.on('request:start', (request, requestId) => {
  console.log(request.method, request.url)
})
```

To read a request body, make sure to clone the request first. Otherwise, it won't be performed as it would be already read.

```js
server.events.on('request:match', async (request) => {
  // Make sure to clone the request so it could be
  // processed further down the line.
  const clone = request.clone()
  const json = await clone.json()

  console.log('Performed request with body:', json)
})
```

---

## Advanced

It is still possible to create custom handlers and resolvers, just make sure to account for the new [resolver call signature](#response-resolver).

### Custom response composition

As this release removes the concept of response composition via `res()`, you can no longer compose context utilities or abstract their partial composed state to a helper function.

Instead, you can abstract a common response logic into a plain function and always returns a `Response` instance.

```js
// utils.js
import { Response } from 'msw'

export function augmentResponse() {
  const response = new Resopnse()
  response.headers.set('X-Response-Source', 'mocks')
  return response
}
```

```js
import { rest, HttpResponse } from 'msw'
import { augmentResponse } from './utils'

export const handlers = [
  rest.get('/user', () => {
    return augmentResponse(HttpResponse.json({ id: 1 }))
  }),
]
```

---

## Common issues

### `Response is not defined`

Make sure to import the `Response` class from the `msw` package. See [this](#responses-in-nodejs).
