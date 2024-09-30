import type { Constructor } from 'type-fest'
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
    super('GET', path, (info) => {
      const stream = new ReadableStream({
        start(controller) {
          const client = new ServerSentEventClient({
            controller,
          })
          const server = new ServerSentEventServer({
            request: info.request,
            client,
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

class ServerSentEventClient {
  private encoder: TextEncoder
  protected controller: ReadableStreamDefaultController

  constructor(args: { controller: ReadableStreamDefaultController }) {
    this.encoder = new TextEncoder()
    this.controller = args.controller
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

const kListener = Symbol('kListener')

class ServerSentEventServer {
  protected request: Request
  protected client: ServerSentEventClient

  constructor(args: { request: Request; client: ServerSentEventClient }) {
    this.request = args.request
    this.client = args.client
  }

  /**
   * Establishes an actual connection for this SSE request
   * and returns the `EventSource` instance.
   */
  public connect(): EventSource {
    const requestUrl = new URL(this.request.url)
    requestUrl.searchParams.set('x-msw-intention', 'bypass')

    let source = new EventSource(requestUrl, {
      withCredentials: this.request.credentials === 'include',
    })

    const addEventListener = source.addEventListener.bind(source)
    source.addEventListener = (event: any, listener: any, options: any) => {
      const wrappedListener = this.wrapEventListener(listener).bind(source)
      Object.defineProperty(listener, kListener, {
        value: wrappedListener,
      })
      addEventListener(event, wrappedListener, options)
    }

    const removeEventListener = source.removeEventListener.bind(source)
    source.removeEventListener = (event: any, listener: any, options: any) => {
      const wrappedListener = listener[kListener] || listener
      removeEventListener(event, wrappedListener, options)
    }

    source = new Proxy(source, {
      set: (target, property, value) => {
        switch (property) {
          case 'onopen':
          case 'onmessage':
          case 'onerror': {
            return Reflect.set(target, property, this.wrapEventListener(value))
          }
        }

        return Reflect.set(target, property, value)
      },
    })

    return source
  }

  private wrapEventListener(listener: (event: Event) => void) {
    const { client } = this

    return function (this: EventSource, event: Event) {
      const EventConstructor = event.constructor as Constructor<Event>
      const cancelableEvent = new EventConstructor(event.type, {
        ...event,
        cancelable: true,
      })

      listener.call(this, cancelableEvent)

      if (event.type === 'open') {
        return
      }

      if (!cancelableEvent.defaultPrevented) {
        switch (event.type) {
          case 'error': {
            client.error()
            break
          }

          default: {
            if (event instanceof MessageEvent) {
              client.send({
                id: event.lastEventId,
                event: event.type === 'message' ? undefined : event.type,
                /**
                 * @fixme Data will already be stringified.
                 * `client.send()` will stringify it again.
                 */
                data: event.data,
              })
            }

            break
          }
        }
      }
    }
  }
}
