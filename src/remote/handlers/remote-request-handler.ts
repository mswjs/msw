import { RequestHandler, type ResponseResolutionContext } from '#core'
import { type RequestHandlerDefaultInfo } from '#core/handlers/RequestHandler'
import { RemoteHttpTransport } from '../transports/http-transport'

type RemoteRequestHandlerParsedResult = {
  response: Response | undefined
}

type RemoteRequestHandlerResolverExtras = {
  response: Response | undefined
}

export class RemoteRequestHandler extends RequestHandler<
  RequestHandlerDefaultInfo,
  RemoteRequestHandlerParsedResult,
  RemoteRequestHandlerResolverExtras
> {
  #transport: RemoteHttpTransport

  constructor(args: { port: number }) {
    super({
      info: {
        header: 'RemoteRequestHandler',
      },
      resolver({ response }) {
        return response
      },
    })

    this.#transport = new RemoteHttpTransport({
      port: args.port,
    })
  }

  async parse(args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }): Promise<any> {
    const response = await this.#transport.handleRequest({
      request: args.request,
    })

    const parsedResult = await super.parse(args)

    if (response != null) {
      parsedResult.response = response
    }

    return parsedResult
  }

  predicate(args: {
    request: Request
    parsedResult: any
    resolutionContext?: ResponseResolutionContext
  }): boolean {
    // Consider this handler matching if the remote process returned a response.
    return args.parsedResult.response != null
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
