import { createServer } from 'node:http'
import { Server as WebSocketServer, type Socket } from 'socket.io'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { AnyHandler, RequestHandler, ResponseResolutionContext } from '#core'
import { defineNetwork } from '#core/experimental/define-network'
import { defaultNetworkOptions } from './setup-server'
import { defineSetupServerApi } from './setup-server-common'
import { HttpPacket } from '../remote/packets/http-packet'

const PORT = 65065

export function setupRemoteServer(...handlers: Array<AnyHandler>) {
  const httpServer = createServer()
  const server = new WebSocketServer()
  server.attach(httpServer)

  const network = defineNetwork({
    ...defaultNetworkOptions,
    handlers: [],
  })
  const commonApi = defineSetupServerApi(network)

  return {
    ...commonApi,
    async listen() {
      const listenPromise = new DeferredPromise<void>()
      httpServer
        .listen(PORT, () => listenPromise.resolve())
        .once('error', (error) => listenPromise.reject(error))
      await listenPromise

      const clientPromise = new DeferredPromise<Socket>()
      server.once('connect', (client) => {
        clientPromise.resolve(client)
      })
      const client = await clientPromise

      network.configure({
        handlers: [
          new RemoteRequestHandler({
            server,
            client,
          }),
          ...handlers,
        ],
      })

      commonApi.listen()
    },
    async close() {
      commonApi.close()

      server.disconnectSockets()
      server.removeAllListeners()

      const closePromise = new DeferredPromise<void>()

      server.close((error) => {
        if (error) {
          closePromise.reject(error)
        } else {
          closePromise.resolve()
        }
      })

      await closePromise
    },
  }
}

class RemoteRequestHandler extends RequestHandler {
  #server: WebSocketServer
  #client: Socket

  constructor(options: { server: WebSocketServer; client: Socket }) {
    super({
      info: {
        header: 'RemoteRequestHandler',
      },
      resolver: ({ response }) => response,
    })

    this.#server = options.server
    this.#client = options.client
  }

  async parse(args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }): Promise<any> {
    const packet = HttpPacket.serializeRequest(args.request)
    this.#server.emit('request', packet)

    const responsePromise = new DeferredPromise<Response | undefined>()
    this.#client.once(`response:${packet.id}`, (response) => {
      responsePromise.resolve(
        response ? HttpPacket.deserializeResponse(response) : undefined,
      )
    })

    const response = await responsePromise
    const parsedResult = await super.parse(args)

    if (response) {
      parsedResult.response = response
    }

    return parsedResult
  }

  predicate(args: {
    request: Request
    parsedResult: any
    resolutionContext?: ResponseResolutionContext
  }): boolean | Promise<boolean> {
    return args.parsedResult.response !== null
  }

  protected extendResolverArgs(args: { request: Request; parsedResult: any }) {
    const resolverArgs = super.extendResolverArgs(args)
    resolverArgs.response = args.parsedResult.response
    return resolverArgs
  }

  log(_args: {
    request: Request
    response: Response
    parsedResult: any
  }): void {
    return
  }
}
