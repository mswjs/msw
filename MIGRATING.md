# Migration guide

This guide will help you migrate from the latest version of MSW to the `next` release that introduces a first-class support for Fetch API primitives to the library. **This is a breaking change**. In fact, this is the biggest change to our public API since they day the library was first published. Do not fret, however, as this is precisely why this document exists.

## Getting started

```sh
npm install msw@next --save-dev
```

## Table of contents

To help you navigate, we've structured this guide on the feature basis. You can read it top-to-bottom, or you can jump to a particular feature you have trouble migrating from.

- [**Response resolver**](#response-resolver) (call signature change)
- [Request changes](#request-changes)
- [req.params](#reqparams)
- [req.cookies](#request-cookies)
- [req.passthrough](#reqpassthrough)
- [res.once](#resonce)
- [Context utilities](#context-utilities)
  - [ctx.status](#ctxstatus)
  - [ctx.set](#ctxset)
  - [ctx.cookie](#ctxcookie)
  - [ctx.body](#ctxbody)
  - [ctx.text](#ctxtext)
  - [ctx.json](#ctxjson)
  - [ctx.xml](#ctxxml)
  - [ctx.data](#ctxdata)
  - [ctx.errors](#ctxerrors)
  - [ctx.delay](#ctxdelay)
  - [ctx.fetch](#ctx-fetch)
- [Life-cycle events](#life-cycle-events)
- [Advanced](#advanced)
- [**What's new in this release?**](#whats-new)
- [Common issues](#common-issues)

---

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

#### `req.params`

Path parameters are now exposed directly on the [Resolver info](#resolver-info) object (previously, `req.params`).

```js
rest.get('/resource', ({ params }) => {
  console.log('Request path parameters:', params)
})
```

#### `req.cookies`

Request cookies are now exposed directly on the [Resolver info](#resolver-info) object (previously, `req.cookies`).

```js
rest.get('/resource', ({ cookies }) => {
  console.log('Request cookies:', cookies)
})
```

#### Request body

The library now does no assumptions when reading the intercepted request's body (previously, `req.body`). Instead, you are in charge to read the request body as you see appropriate.

> Note that since the intercepted request is now represented by a Fetch API `Request` instance, its `request.body` property still exists but returns a `ReadableStream`.

For example, this is how you would read request body:

```js
rest.post('/resource', async ({ request }) => {
  const data = await request.json()
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

## `res.once`

To create a one-time request handler, pass it an object as the third argument with `once: true` set:

```js
import { HttpResponse, rest } from 'msw'

export const handlers = [
  rest.get(
    '/user',
    () => {
      return HttpResponse.text('hello')
    },
    { once: true },
  ),
]
```

## `req.passthrough`

```js
import { rest, passthrough } from 'msw'

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

Let's go through each previously existing context utility and see how to declare its analogue using the `Response` class.

### `ctx.status`

```js
import { rest, HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.text('hello', { status: 201 })
  }),
]
```

### `ctx.set`

```js
import { rest, HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.text('hello', {
      headers: {
        'Content-Type': 'text/plain; charset=windows-1252',
      },
    })
  }),
]
```

### `ctx.cookie`

```js
import { HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.text('hello', {
      headers: {
        'Set-Cookie': 'token=abc-123',
      },
    })
  }),
]
```

Although setting `Set-Cookie` header has no effect on a regular `Response` instance, we detect that header on `HttpResponse` and implement response cookie forwarding on our side for you. **This is why you must always use `HttpResponse` in order to mock response cookies**.

Since Fetch API Headers do not support multiple values as the `HeadersInit`, to mock a multi-value response cookie create a `Headers` instance and use the `.append()` method to set multiple `Set-Cookie` response headers.

```js
import { Headers, HttpResponse, rest } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    const headers = new Headers()
    headers.append('Set-Cookie', 'sessionId=123')
    headers.append('Set-Cookie', 'gtm=en_US')

    return HttpResponse.plain(null, { headers })
  }),
]
```

### `ctx.body`

```js
import { rest, HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.raw('any-body')
  }),
]
```

> Do not forget to set the `Content-Type` header that represents the mocked response's body type. If using common response body types, like text or json, see the respective migration instructions for those context utilities below.

### `ctx.text`

```js
import { rest, HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.text('hello')
  }),
]
```

### `ctx.json`

```js
import { rest, HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
]
```

### `ctx.xml`

```js
import { rest, HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.xml('<user id="abc-123" />')
  }),
]
```

### `ctx.data`

The `ctx.data` utility has been removed in favor of constructing a mocked JSON response with the "data" property in it.

```js
import { HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.json({
      data: {
        user: {
          firstName: 'John',
        },
      },
    })
  }),
]
```

### `ctx.errors`

The `ctx.data` utility has been removed in favor of constructing a mocked JSON response with the "data" property in it.

```js
import { HttpResponse } from 'msw'

export const handlers = [
  rest.get('/resource', () => {
    return HttpResponse.json({
      errors: [
        {
          message: 'Something went wrong',
        },
      ],
    })
  }),
]
```

### `ctx.delay`

```js
import { rest, HttpResponse, delay } from 'msw'

export const handlers = [
  rest.get('/resource', async () => {
    await delay()
    return HttpResponse.text('hello')
  }),
]
```

The `delay` function has the same call signature as the `ctx.delay` context function. This means it supports the delay mode as an argument:

```js
await delay(500)
await delay('infinite')
```

### `ctx.fetch`

The `ctx.fetch()` function has been removed in favor of the `bypass()` function. You should now always perform a regular `fetch()` call and wrap the request in the `bypass()` function if you wish for it to ignore any otherwise matching request handlers.

```js
import { rest, HttpResponse, bypass } from 'msw'

export const handlers = [
  rest.get('/resource', async ({ request }) => {
    const fetchArgs = await bypass(request)

    // Use the regular "fetch" from your environment.
    const originalResponse = await fetch(...fetchArgs)
    const json = await originalResponse.json()

    // ...handle the original response, maybe return a mocked one.
  }),
]
```

The `bypass()` function also accepts `RequestInit` as the second argument to modify the bypassed request.

```js
// Bypass the given "request" and modify its headers.
bypass(request, {
  headers: {
    'X-Modified-Header': 'true',
  },
})
```

---

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

The `response:*` events now always contain the response reference, the related request, and its id in the listener arguments.

```js
worker.events.on('response:mocked', (response, request, requestId) => {
  console.log('response to %s %s is:', request.method, request.url, response)
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
  const response = new Response()
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

## What's new?

The main benefit of this release is the adoption of Fetch API primitives—`Request` and `Response` classes. By handling requests and responses as the platform does it, you bring your API mocking setup to the next level. Less library-specific abstractions, flatter learning curve, improved compatibility with other tools. But, most importantly, specification compliance and investment into a solution that uses standard APIs that are here to stay.

### New request body methods

You can now read the intercepted request body as you would a regular `Request` instance. This mainly means the addition of the following methods on the `request`:

- `request.blob()`
- `request.formData()`
- `request.arrayBuffer()`

For example, this is how you would read the request as `Blob`:

```js
import { rest } from 'msw'

export const handlers = [
  rest.get('/resource', async ({ request }) => {
    const blob = await request.blob()
  }),
]
```

### Support `ReadableStream` mocked responses

You can now send a `ReadableStream` as the mocked response body. This is great for mocking any kind of streaming in HTTP responses.

```js
import { rest, HttpResponse, ReadableStream, delay } from 'msw'

rest.get('/greeting', () => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('hello'))
      await delay(100)
      controller.enqueue(encoder.encode('world'))
      await delay(100)
      controller.close()
    },
  })

  return HttpResponse.plain(stream)
})
```

---

## Common issues

### `Response is not defined`

Make sure to import the `Response` class from the `msw` package. See [this](#responses-in-nodejs).
