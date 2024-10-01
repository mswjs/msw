import { invariant } from 'outvariant'
import type { ResponseResolver } from '~/core/handlers/RequestHandler'
import {
  HttpHandler,
  type HttpRequestResolverExtras,
  type HttpRequestParsedResult,
} from '~/core/handlers/HttpHandler'
import type { Path, PathParams } from '~/core/utils/matching/matchRequestUrl'

export type ServerSentEventResolverExtras<Params extends PathParams> =
  HttpRequestResolverExtras<Params> & {
    client: ServerSentEventClient
    server: ServerSentEventServer
  }

export type ServerSentEventResolver<Params extends PathParams> =
  ResponseResolver<ServerSentEventResolverExtras<Params>, any, any>

export type ServerSentEventRequestHandler = <
  Params extends PathParams<keyof Params> = PathParams,
  RequestPath extends Path = Path,
>(
  path: RequestPath,
  resolver: ServerSentEventResolver<Params>,
) => HttpHandler

/**
 * Request handler for Server-Sent Events (SSE).
 *
 * @example
 * sse('http://localhost:4321', ({ source }) => {
 *   source.send({ data: 'hello world' })
 * })
 *
 * @see {@link https://mswjs.io/docs/api/sse `sse()` API reference}
 */
export const sse: ServerSentEventRequestHandler = (path, resolver) => {
  return new ServerSentEventHandler(path, resolver)
}

class ServerSentEventHandler extends HttpHandler {
  constructor(path: Path, resolver: ServerSentEventResolver<any>) {
    invariant(
      typeof EventSource !== 'undefined',
      'Failed to construct a Server-Sent Event handler for path "%s": your environment does not support the EventSource API',
      path,
    )

    super('GET', path, (info) => {
      const stream = new ReadableStream({
        start(controller) {
          const client = new ServerSentEventClient({
            controller,
          })
          const server = new ServerSentEventServer({
            request: info.request,
          })

          resolver({
            ...info,
            client,
            server,
          })
        },
      })

      return new Response(stream, {
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
      })
    })
  }

  predicate(args: {
    request: Request
    parsedResult: HttpRequestParsedResult
  }): boolean {
    // Ignore non-SSE requests.
    if (
      args.request.headers.get('accept')?.toLowerCase() !== 'text/event-stream'
    ) {
      return false
    }

    // If it is a SSE request, match it against its method and path.
    return super.predicate(args)
  }
}

const kSend = Symbol('kSend')

class ServerSentEventClient {
  private encoder: TextEncoder
  protected controller: ReadableStreamDefaultController

  constructor(args: { controller: ReadableStreamDefaultController }) {
    this.encoder = new TextEncoder()
    this.controller = args.controller
  }

  /**
   * Sends the given payload to the underlying `EventSource`.
   */
  public send(payload: { id?: string; event?: string; data: unknown }): void {
    this[kSend]({
      id: payload.id,
      event: payload.event,
      data: JSON.stringify(payload.data),
    })
  }

  /**
   * Dispatches the given event to the underlying `EventSource`.
   */
  public dispatchEvent(event: Event) {
    if (event instanceof MessageEvent) {
      /**
       * @note Use the internal send mechanism to skip normalization
       * of the message data (already normalized by the server).
       */
      this[kSend]({
        id: event.lastEventId || undefined,
        event: event.type === 'message' ? undefined : event.type,
        data: event.data,
      })
      return
    }

    if (event.type === 'error') {
      this.error()
      return
    }
  }

  /**
   * Errors the underlying `EventSource`, closing the connection.
   */
  public error(): void {
    this.controller.error()
  }

  private [kSend](payload: {
    id?: string
    event?: string
    data: string
  }): void {
    const frames: Array<string> = []

    if (payload.event) {
      frames.push(`event:${payload.event}`)
    }

    frames.push(`data:${payload.data}`)

    if (payload.id) {
      frames.push(`id:${payload.id}`)
    }

    frames.push('', '')
    this.controller.enqueue(this.encoder.encode(frames.join('\n')))
  }
}

class ServerSentEventServer {
  protected request: Request

  constructor(args: { request: Request }) {
    this.request = args.request
  }

  /**
   * Establishes an actual connection for this SSE request
   * and returns the `EventSource` instance.
   */
  public connect(): EventSource {
    const requestUrl = new URL(this.request.url)
    /**
     * @todo @fixme Explore if there's a different way to bypass this request.
     * It has to be bypassed not to cause an infinite loop of it being intercepted.
     */
    requestUrl.searchParams.set('x-msw-intention', 'bypass')

    const source = new EventSource(requestUrl, {
      withCredentials: this.request.credentials === 'include',
    })

    return source
  }
}
