import {
  createTestHttpServer,
  type TestHttpServer,
} from '@epic-web/test-server/http'
import type { TestProject } from 'vitest/node'
import { WebSocketServer } from 'ws'

let testServer: TestHttpServer
let sseUpstreamRequestCount = 0

const webSocketServer = new WebSocketServer({
  host: '127.0.0.1',
  port: 0,
})

webSocketServer.on('connection', (client, request) => {
  const url = new URL(request.url ?? '/', 'ws://localhost')

  if (url.searchParams.has('greet')) {
    client.send('hello from server')
  }

  if (url.searchParams.has('greet-binary')) {
    client.send(new TextEncoder().encode('hello'))
  }

  if (url.searchParams.has('echo')) {
    client.on('message', (data, isBinary) => {
      client.send(data, { binary: isBinary })
    })
  }

  if (url.searchParams.has('conversation')) {
    client.send('hello from server')
    client.on('message', (data) => {
      if (data.toString() === 'how are you, server?') {
        client.send('thanks, not bad')
      }
    })
  }

  if (url.searchParams.has('close')) {
    const [code, reason] = (url.searchParams.get('close') ?? '').split(',')
    client.close(Number(code) || undefined, reason)
  }
})

function createSharedTestServer(): Promise<TestHttpServer> {
  return createTestHttpServer({
    protocols: ['http', 'https'],
    defineRoutes(router) {
      router.use('*', async (context, next) => {
        await next()

        if (context.req.path === '/cors-error') {
          return
        }

        context.res.headers.set('access-control-allow-origin', '*')
        context.res.headers.set('access-control-allow-headers', '*')
        context.res.headers.set('access-control-allow-methods', '*')
        context.res.headers.set('access-control-expose-headers', '*')
      })

      router.post('/analytics-bypass', () => {
        return new Response(null, { status: 200 })
      })

      router.post('/login', () => {
        return new Response(null, { status: 404 })
      })

      router.get('/book/:bookId', () => {
        return new Response(null, { status: 404 })
      })

      router.post('/irrelevant', () => {
        return new Response(null, { status: 404 })
      })

      router.post('/blog/article', () => {
        return new Response(null, { status: 404 })
      })

      router.get('/empty-posts', () => {
        return new Response(null, { status: 204 })
      })

      router.get('/range', (context) => {
        const data = new TextEncoder().encode('hello world')
        const range = context.req.header('range')

        if (!range) {
          return new Response('range missing', { status: 400 })
        }

        const [startValue, endValue] = range.replace(/bytes=/, '').split('-')
        const start = Number(startValue)
        const end = endValue ? Number(endValue) : data.byteLength - 1
        const content = data.slice(start, end)

        return new Response(content, {
          status: 206,
          headers: {
            'accept-range': 'bytes',
            'content-range': `bytes=${start}-${end}/${data.byteLength}`,
            'content-length': content.byteLength.toString(),
            'content-type': 'text/plain',
          },
        })
      })

      router.get('/cors', () => {
        return new Response('hello')
      })

      router.get('/cors-error', () => {
        return new Response('not allowed')
      })

      router.get('/passthrough-resource', (context) => {
        return new Response('hello world', {
          headers: context.req.raw.headers,
        })
      })

      router.post('/passthrough/user', () => {
        return Response.json(
          { name: 'John' },
          { headers: { 'x-powered-by': 'Express' } },
        )
      })

      for (const status of [204, 205, 304]) {
        router.post(`/passthrough/status-${status}/user`, () => {
          return new Response(null, { status })
        })
      }

      router.get('/stream', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('first-chunk'))
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode(' last-chunk'))
              controller.close()
            }, 1_500)
          },
        })

        return new Response(stream)
      })

      router.get('/text-event-stream', () => {
        const chunks = ['hello', 'beautiful', 'world']
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(`data: ${chunk}\n\n`))
              await new Promise((resolve) => {
                setTimeout(resolve, 150)
              })
            }

            controller.close()
          },
        })

        return new Response(stream, {
          headers: { 'content-type': 'text/event-stream' },
        })
      })

      router.get('/sse/upstream/message', () => {
        return new Response('data: {"message": "hello"}\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        })
      })

      router.get('/sse/upstream/custom', () => {
        return new Response('event: custom\ndata: {"message": "hello"}\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        })
      })

      router.get('/sse/upstream/error', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.error()
          },
        })

        return new Response(stream, {
          headers: { 'content-type': 'text/event-stream' },
        })
      })

      router.get('/sse/upstream/custom-error', () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.error(new Error('Custom stream error'))
          },
        })

        return new Response(stream, {
          headers: { 'content-type': 'text/event-stream' },
        })
      })

      router.post('/sse/upstream/reset', () => {
        sseUpstreamRequestCount = 0
        return new Response(null, { status: 204 })
      })

      router.get('/sse/upstream/count', () => {
        return Response.json({ count: sseUpstreamRequestCount })
      })

      router.get('/sse/upstream/retry', () => {
        sseUpstreamRequestCount += 1
        return new Response('retry: 200\n\ndata: {"message": "hello"}\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        })
      })

      router.post('/events/no-response', () => {
        return new Response('original-response')
      })

      router.get('/events/unknown-route', () => {
        return new Response('majestic-unknown', { status: 404 })
      })

      router.get('/events/passthrough', () => {
        return new Response('passthrough-response')
      })

      router.post('/events/bypass', () => {
        return new Response('bypassed-response')
      })

      router.get('/user', () => {
        return Response.json({
          name: 'The Octocat',
          location: 'San Francisco',
        })
      })

      router.get('/repos/:owner/:name', (context) => {
        return Response.json({ name: context.req.param('name') })
      })

      router.post('/headers-proxy', (context) => {
        if (!context.req.header('authorization')) {
          return Response.json({ message: 'error' }, { status: 403 })
        }

        return Response.json({ message: 'success' })
      })

      router.get('/method/user', () => {
        return Response.json(
          { uses: 'original' },
          { headers: { 'x-powered-by': 'Express' } },
        )
      })

      router.post('/method/user', () => {
        return Response.json({ mocked: false }, { status: 500 })
      })

      router.post('/anonymous/graphql', () => {
        return Response.json({
          data: {
            user: {
              id: 'abc-123',
            },
          },
        })
      })

      router.post('/link-bypass/graphql', () => {
        return new Response(null, { status: 500 })
      })

      router.all('/mutation/graphql', (context) => {
        if (context.req.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-headers': '*',
              'access-control-allow-methods': '*',
            },
          })
        }

        return new Response(null, {
          status: 405,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': '*',
          },
        })
      })

      router.all('/query/graphql', (context) => {
        if (context.req.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-headers': '*',
              'access-control-allow-methods': '*',
            },
          })
        }

        return new Response(null, {
          status: 405,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': '*',
          },
        })
      })

      router.post('/response-patching/graphql', () => {
        return Response.json({
          data: {
            user: {
              firstName: 'John',
              lastName: 'Maverick',
            },
          },
        })
      })

      router.post('/search', () => {
        return Response.json({ results: [1, 2, 3] })
      })

      router.all('/head/posts', (context) => {
        if (context.req.method === 'HEAD') {
          return new Response(null, {
            headers: {
              'access-control-expose-headers': 'x-custom',
              'x-custom': 'HEAD REQUEST PATCHED',
            },
          })
        }

        return new Response(null, { status: 405 })
      })

      router.get('/posts', () => {
        return Response.json({ id: 101 })
      })

      router.post('/posts', () => {
        return Response.json(
          { id: 101 },
          {
            headers: {
              'access-control-expose-headers': 'x-custom',
              'x-custom': 'POST REQUEST PATCHED',
            },
          },
        )
      })

      router.all('*', async (context) => {
        const headers = new Headers(context.req.raw.headers)
        headers.delete('content-length')
        headers.delete('connection')
        headers.delete('transfer-encoding')

        if (!headers.has('content-type')) {
          headers.set('content-type', 'text/plain; charset=utf-8')
        }

        if (context.req.method === 'GET' || context.req.method === 'HEAD') {
          return new Response('original-response', { headers })
        }

        return new Response(context.req.raw.body, { headers })
      })
    },
  })
}

export async function setup(project: TestProject): Promise<void> {
  testServer = await createSharedTestServer()
  const webSocketAddress = webSocketServer.address()

  if (webSocketAddress == null) {
    throw new Error('Failed to resolve the WebSocket test server address')
  }

  project.provide('testServer', {
    http: testServer.http.url().href,
    https: testServer.https.url().href,
    ws:
      typeof webSocketAddress === 'string'
        ? webSocketAddress
        : `ws://${webSocketAddress.address}:${webSocketAddress.port}/`,
  })
}

export async function teardown(): Promise<void> {
  await testServer.close()
  await new Promise<void>((resolve, reject) => {
    for (const client of webSocketServer.clients) {
      client.close()
    }

    webSocketServer.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}
