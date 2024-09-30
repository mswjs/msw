import type { ResponseResolver } from '~/core/handlers/RequestHandler'
import {
  HttpHandler,
  type HttpRequestResolverExtras,
  type HttpRequestParsedResult,
} from '~/core/handlers/HttpHandler'
import { HttpResponse } from '~/core/HttpResponse'
import type { Path, PathParams } from '~/core/utils/matching/matchRequestUrl'

export type ServerSentEventResolverExtras<Params extends PathParams> =
  HttpRequestResolverExtras<Params> & {
    source: ServerSentEventSource
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
    super('GET', path, (info) => {
      const stream = new ReadableStream({
        start(controller) {
          resolver({
            ...info,
            source: new ServerSentEventSource(controller),
          })
        },
      })

      return new HttpResponse(stream, {
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

class ServerSentEventSource {
  private encoder: TextEncoder

  constructor(protected controller: ReadableStreamDefaultController) {
    this.encoder = new TextEncoder()
  }

  /**
   * Dispatches the given event to the underlying `EventSource`.
   */
  public send(payload: { id?: string; event?: string; data: unknown }): void {
    const frames: Array<string> = []

    if (payload.event) {
      frames.push(`event:${payload.event}`)
    }

    frames.push(`data:${JSON.stringify(payload.data)}`)

    if (payload.id) {
      frames.push(`id:${payload.id}`)
    }

    frames.push('', '')
    this.controller.enqueue(this.encoder.encode(frames.join('\n')))
  }

  /**
   * Errors the underlying `EventSource`, closing the connection.
   */
  public error(): void {
    this.controller.error()
  }
}
