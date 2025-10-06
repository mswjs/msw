import {
  RequestHandler,
  type RequestHandlerDefaultInfo,
} from '../../handlers/RequestHandler'
import type { ResponseResolutionContext } from '../../utils/executeHandlers'
import { NetworkHttpTransport } from '../transports/http-transport'

interface RemoteRequestHandlerParsedResult {
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
  #transport: NetworkHttpTransport

  constructor(args: { port: number }) {
    super({
      info: {
        header: 'RemoteRequestHandler',
      },
      resolver({ response }: RemoteRequestHandlerResolverExtras) {
        return response
      },
    })

    this.#transport = new NetworkHttpTransport({
      port: args.port,
    })
  }

  async parse(args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }): Promise<any> {
    const response = await this.#transport
      .handleRequest({ request: args.request })
      .catch(() => undefined)

    const parsedResult = await super.parse(args)

    if (response != null) {
      parsedResult.response = response
    }

    return parsedResult
  }

  predicate(args: {
    request: Request
    parsedResult: RemoteRequestHandlerParsedResult
    resolutionContext?: ResponseResolutionContext
  }): boolean | Promise<boolean> {
    // This handler is considered matching if the remote process
    // decided to handle the intercepted request.
    return args.parsedResult.response != null
  }

  protected extendResolverArgs(args: {
    request: Request
    parsedResult: RemoteRequestHandlerParsedResult
  }): RemoteRequestHandlerResolverExtras {
    const resolverArgs = super.extendResolverArgs(args)
    resolverArgs.response = args.parsedResult.response
    return resolverArgs
  }

  log(_args: {
    request: Request
    response: Response
    parsedResult: RemoteRequestHandlerParsedResult
  }): void {
    /**
     * @note Skip logging. This is an internal request handler.
     */
    return
  }
}
