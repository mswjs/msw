import { createRequestId } from '@mswjs/interceptors'
import type { ResponseResolutionContext } from '../utils/executeHandlers'
import {
  RequestHandler,
  type ResponseResolver,
  type RequestHandlerDefaultInfo,
} from './RequestHandler'
import { RemoteClient } from 'node/setupRemoteServer'

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
  protected remoteClient: RemoteClient
  protected contextId?: string

  constructor(
    readonly args: {
      remoteClient: RemoteClient
      contextId?: string
    },
  ) {
    super({
      info: {
        header: 'RemoteRequestHandler',
      },
      resolver() {},
    })

    this.remoteClient = args.remoteClient
    this.contextId = args.contextId
  }

  async parse(args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }): Promise<RemoteRequestHandlerParsedResult> {
    const parsedResult = await super.parse(args)

    if (!this.remoteClient.connected) {
      return parsedResult
    }

    /**
     * @note Remote request handler is special.
     * It cannot await the mocked response from the remote process in
     * the resolver because that would mark it is matching, preventing
     * MSW from treating unhandled requests as unhandled.
     *
     * Instead, the remote handler await the mocked response during the
     * parsing phase since that's the only async phase before predicate.
     */
    const response = await this.remoteClient.handleRequest({
      contextId: this.contextId,
      requestId: createRequestId(),
      request: args.request,
    })

    parsedResult.response = response
    return parsedResult
  }

  predicate(args: {
    request: Request
    parsedResult: RemoteRequestHandlerParsedResult
  }): boolean {
    // The remote handler is considered matching if the remote process
    // returned any mocked response for the intercepted request.
    return typeof args.parsedResult.response !== 'undefined'
  }

  protected extendResolverArgs(args: {
    request: Request
    parsedResult: RemoteRequestHandlerParsedResult
  }): RemoteRequestHandlerResolverExtras {
    const resolverInfo = super.extendResolverArgs(args)

    return {
      ...resolverInfo,
      // Propagate the mocked response returned from the remote server
      // onto the resolver function.
      response: args.parsedResult.response,
    }
  }

  protected resolver: ResponseResolver<
    RemoteRequestHandlerResolverExtras,
    any,
    any
  > = ({ response }) => {
    // Return the mocked response received from the remote process as-is.
    return response
  }

  log(_args: {
    request: Request
    response: Response
    parsedResult: RemoteRequestHandlerParsedResult
  }): void {
    // Intentionally skip logging the remote request handler.
    // This is an internal handler so let's not confuse the developer.
    return
  }
}
