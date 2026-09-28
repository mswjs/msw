import { createTestHttpServer } from '@epic-web/test-server/http'
import { createWebSocketMiddleware } from '@epic-web/test-server/ws'
import { createYoga, type YogaSchemaDefinition } from 'graphql-yoga'
import { useServer } from 'graphql-ws/use/ws'

/**
 * Create a real GraphQL server that serves queries over HTTP and
 * subscriptions over WebSocket (`graphql-transport-ws`).
 */
export async function createTestGraphQLServer(options: {
  pathname?: string
  schema: YogaSchemaDefinition<Record<string, unknown>, Record<string, unknown>>
  /**
   * Called with the `connectionParams` of every connected client.
   */
  onConnect?: (connectionParams?: Record<string, unknown>) => void
}) {
  const pathname = options.pathname || '/graphql'

  const yoga = createYoga({
    schema: options.schema,
    graphiql: false,
    graphqlEndpoint: pathname,
  })

  const testServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get(`${pathname}/*`, ({ req }) => {
        return yoga.fetch(req.raw)
      })
    },
  })
  const wss = createWebSocketMiddleware({
    server: testServer,
    pathname,
  })

  const disposeOfServer = useServer(
    {
      onConnect: (ctx) => {
        options.onConnect?.(ctx.connectionParams)
      },
      execute: (args: any) => args.execute(args),
      subscribe: (args: any) => args.subscribe(args),
      onSubscribe: async (ctx, _id, payload) => {
        const { schema, execute, subscribe, contextFactory, parse, validate } =
          yoga.getEnveloped({
            ...ctx,
            req: ctx.extra.request,
            socket: ctx.extra.socket,
            params: payload,
          })

        const args = {
          schema,
          operationName: payload.operationName,
          document: parse(payload.query),
          variableValues: payload.variables,
          contextValue: await contextFactory(),
          execute,
          subscribe,
        }

        const errors = validate(args.schema, args.document)

        if (errors.length) {
          return errors
        }

        return args
      },
    },
    wss.raw,
  )

  return {
    async [Symbol.asyncDispose]() {
      await Promise.all([
        testServer[Symbol.asyncDispose](),
        wss[Symbol.asyncDispose](),
      ])
      await disposeOfServer.dispose()
    },
    http: {
      url() {
        return testServer.http.url(pathname)
      },
    },
    ws: {
      url() {
        return wss.ws.url()
      },
    },
  }
}
