import type { Socket } from 'socket.io-client'
import { createRequestId } from '@mswjs/interceptors'
import { DeferredPromise } from '@open-draft/deferred-promise'
import type { SyncServerEventsMap } from '../../node/setupRemoteServer'
import {
  serializeRequest,
  deserializeResponse,
} from '../utils/request/serializeUtils'
import type { ResponseResolutionContext } from '../utils/executeHandlers'
import {
  RequestHandler,
  type ResponseResolver,
  type RequestHandlerDefaultInfo,
} from './RequestHandler'

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
  private socket: Socket<SyncServerEventsMap>
  private contextId?: string

  constructor(args: {
    socket: Socket<SyncServerEventsMap>
    contextId?: string
  }) {
    super({
      info: {
        header: 'RemoteRequestHandler',
      },
      resolver() {},
    })

    this.socket = args.socket
    this.contextId = args.contextId
  }

  async parse(args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }): Promise<RemoteRequestHandlerParsedResult> {
    const parsedResult = await super.parse(args)
    const responsePromise = new DeferredPromise<Response | undefined>()

    /**
     * @note Remote request handler is special.
     * It cannot await the mocked response from the remote process in
     * the resolver because that would mark it is matching, preventing
     * MSW from treating unhandled requests as unhandled.
     *
     * Instead, the remote handler await the mocked response during the
     * parsing phase since that's the only async phase before predicate.
     */
    this.socket.emit('request', {
      requestId: createRequestId(),
      serializedRequest: await serializeRequest(args.request),
      contextId: this.contextId,
    })

    /**
     * @todo Handle timeouts.
     * @todo Handle socket errors.
     */
    this.socket.on('response', ({ serializedResponse }) => {
      responsePromise.resolve(
        serializedResponse
          ? deserializeResponse(serializedResponse)
          : undefined,
      )
    })

    return {
      ...parsedResult,
      // Set the received mocked response on the parsed result so it
      // can be accessed in the predicate and response resolver functions.
      response: await responsePromise,
    }
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
