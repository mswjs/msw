import { invariant } from 'outvariant'
import type { ResponseResolver } from '~/core/handlers/RequestHandler'
import {
  HttpHandler,
  type HttpRequestResolverExtras,
  type HttpRequestParsedResult,
} from '~/core/handlers/HttpHandler'
import type { Path, PathParams } from '~/core/utils/matching/matchRequestUrl'
import { delay } from '~/core/delay'

export type ServerSentEventResolverExtras<
  EventMap extends Record<string, unknown>,
  Params extends PathParams,
> = HttpRequestResolverExtras<Params> & {
  client: ServerSentEventClient<EventMap>
  server: ServerSentEventServer
}

export type ServerSentEventResolver<
  EventMap extends Record<string, unknown>,
  Params extends PathParams,
> = ResponseResolver<ServerSentEventResolverExtras<EventMap, Params>, any, any>

export type ServerSentEventRequestHandler = <
  EventMap extends Record<string, unknown>,
  Params extends PathParams<keyof Params> = PathParams,
  RequestPath extends Path = Path,
>(
  path: RequestPath,
  resolver: ServerSentEventResolver<EventMap, Params>,
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

class ServerSentEventHandler<
  EventMap extends Record<string, unknown>,
> extends HttpHandler {
  constructor(path: Path, resolver: ServerSentEventResolver<EventMap, any>) {
    invariant(
      typeof EventSource !== 'undefined',
      'Failed to construct a Server-Sent Event handler for path "%s": your environment does not support the EventSource API',
      path,
    )

    super('GET', path, (info) => {
      const stream = new ReadableStream({
        start(controller) {
          const client = new ServerSentEventClient<EventMap>({
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

const kSend = Symbol('kSend')

class ServerSentEventClient<EventMap extends Record<string, unknown>> {
  private encoder: TextEncoder
  protected controller: ReadableStreamDefaultController

  constructor(args: { controller: ReadableStreamDefaultController }) {
    this.encoder = new TextEncoder()
    this.controller = args.controller
  }

  /**
   * Sends the given payload to the underlying `EventSource`.
   */
  public send<EventType extends keyof EventMap & string>(
    payload:
      | {
          id?: string
          event: EventType
          data: EventMap[EventType]
        }
      | {
          id?: string
          event?: never
          data?: EventMap['message']
        },
  ): void {
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

  private [kSend]<EventType extends keyof EventMap & string>(payload: {
    id?: string
    event?: EventType
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
  private request: Request
  private client: ServerSentEventClient<any>

  constructor(args: { request: Request; client: ServerSentEventClient<any> }) {
    this.request = args.request
    this.client = args.client
  }

  /**
   * Establishes an actual connection for this SSE request
   * and returns the `EventSource` instance.
   */
  public connect(): EventSource {
    const source = new ObservableEventSource(this.request.url, {
      withCredentials: this.request.credentials === 'include',
      headers: {
        /**
         * @note Mark this request as bypassed so it doesn't trigger
         * an infinite loop matching the existing request handler.
         */
        'x-msw-intention': 'bypass',
      },
    })

    source[kOnAnyMessage] = (event) => {
      // Schedule the server-to-client forwarding for the next tick
      // so the user can prevent the message event.
      queueMicrotask(() => {
        if (!event.defaultPrevented) {
          this.client.dispatchEvent(event)
        }
      })
    }

    return source
  }
}

interface ObservableEventSourceInit extends EventSourceInit {
  headers?: HeadersInit
}

type EventHandler<E extends Event> = (this: EventSource, event: E) => any

const kRequest = Symbol('kRequest')
const kReconnectionTime = Symbol('kReconnectionTime')
const kLastEventId = Symbol('kLastEventId')
const kAbortController = Symbol('kAbortController')
const kOnOpen = Symbol('kOnOpen')
const kOnMessage = Symbol('kOnMessage')
const kOnAnyMessage = Symbol('kOnAnyMessage')
const kOnError = Symbol('kOnError')

class ObservableEventSource extends EventTarget implements EventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2

  public readonly CONNECTING = ObservableEventSource.CONNECTING
  public readonly OPEN = ObservableEventSource.OPEN
  public readonly CLOSED = ObservableEventSource.CLOSED

  public readyState: number
  public url: string
  public withCredentials: boolean

  private [kRequest]: Request
  private [kReconnectionTime]: number
  private [kLastEventId]: string
  private [kAbortController]: AbortController
  private [kOnOpen]: EventHandler<Event> | null = null
  private [kOnMessage]: EventHandler<MessageEvent> | null = null
  private [kOnAnyMessage]: EventHandler<MessageEvent> | null = null
  private [kOnError]: EventHandler<Event> | null = null

  constructor(url: string | URL, init?: ObservableEventSourceInit) {
    super()

    this.url = new URL(url).href
    this.withCredentials = init?.withCredentials ?? false

    this.readyState = this.CONNECTING

    // Support custom request init.
    const headers = new Headers(init?.headers || {})
    headers.set('accept', 'text/event-stream')

    this[kAbortController] = new AbortController()
    this[kReconnectionTime] = 2000
    this[kLastEventId] = ''
    this[kRequest] = new Request(this.url, {
      method: 'GET',
      headers,
      credentials: this.withCredentials ? 'include' : 'omit',
      signal: this[kAbortController].signal,
    })

    this.connect()
  }

  get onopen(): EventHandler<Event> | null {
    return this[kOnOpen]
  }

  set onopen(handler: EventHandler<Event>) {
    if (this[kOnOpen]) {
      this.removeEventListener('open', this[kOnOpen])
    }
    this[kOnOpen] = handler.bind(this)
    this.addEventListener('open', this[kOnOpen])
  }

  get onmessage(): EventHandler<MessageEvent> | null {
    return this[kOnMessage]
  }
  set onmessage(handler: EventHandler<MessageEvent>) {
    if (this[kOnMessage]) {
      this.removeEventListener('message', { handleEvent: this[kOnMessage] })
    }
    this[kOnMessage] = handler.bind(this)
    this.addEventListener('message', { handleEvent: this[kOnMessage] })
  }

  get onerror(): EventHandler<Event> | null {
    return this[kOnError]
  }
  set oneerror(handler: EventHandler<Event>) {
    if (this[kOnError]) {
      this.removeEventListener('error', { handleEvent: this[kOnError] })
    }
    this[kOnError] = handler.bind(this)
    this.addEventListener('error', { handleEvent: this[kOnError] })
  }

  public addEventListener<K extends keyof EventSourceEventMap>(
    type: K,
    listener: EventHandler<EventSourceEventMap[K]>,
    options?: boolean | AddEventListenerOptions,
  ): void
  public addEventListener(
    type: string,
    listener: EventHandler<MessageEvent>,
    options?: boolean | AddEventListenerOptions,
  ): void
  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void

  public addEventListener(
    type: string,
    listener: EventHandler<MessageEvent> | EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options,
    )
  }

  public removeEventListener<K extends keyof EventSourceEventMap>(
    type: K,
    listener: (this: EventSource, ev: EventSourceEventMap[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void
  public removeEventListener(
    type: string,
    listener: (this: EventSource, event: MessageEvent) => any,
    options?: boolean | EventListenerOptions,
  ): void
  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void

  public removeEventListener(
    type: string,
    listener: EventHandler<MessageEvent> | EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.removeEventListener(
      type,
      listener as EventListenerOrEventListenerObject,
      options,
    )
  }

  public dispatchEvent(event: Event): boolean {
    if (this.readyState === this.CLOSED) {
      return false
    }

    return super.dispatchEvent(event)
  }

  public close(): void {
    this[kAbortController].abort()
    this.readyState = this.CLOSED
  }

  private async connect() {
    const response = await fetch(this[kRequest])
    this.processResponse(response)
  }

  private processResponse(response: Response): void {
    if (!response.body) {
      this.failConnection()
      return
    }

    if (isNetworkError(response)) {
      this.reestablishConnection()
      return
    }

    if (
      response.status !== 200 ||
      response.headers.get('content-type') !== 'text/event-stream'
    ) {
      this.failConnection()
      return
    }

    this.announceConnection()
    this.interpretResponseBody(response)
  }

  private announceConnection(): void {
    queueMicrotask(() => {
      if (this.readyState !== this.CLOSED) {
        this.readyState = this.OPEN
        this.dispatchEvent(new Event('open'))
      }
    })
  }

  private interpretResponseBody(response: Response): void {
    const parsingStream = new EventSourceParsingStream({
      message: (message) => {
        if (message.id) {
          this[kLastEventId] = message.id
        }

        if (message.retry) {
          this[kReconnectionTime] = message.retry
        }

        const messageEvent = new MessageEvent(
          message.event ? message.event : 'message',
          {
            data: message.data,
            origin: this[kRequest].url,
            lastEventId: this[kLastEventId],
            cancelable: true,
          },
        )

        this[kOnAnyMessage]?.(messageEvent)
        this.dispatchEvent(messageEvent)
      },
    })

    response.body!.pipeTo(parsingStream).then(() => {
      this.processResponseEndOfBody(response)
    })
  }

  private processResponseEndOfBody(response: Response): void {
    if (!isNetworkError(response)) {
      this.reestablishConnection()
    }
  }

  private async reestablishConnection(): Promise<void> {
    queueMicrotask(() => {
      if (this.readyState === this.CLOSED) {
        return
      }

      this.readyState = this.CONNECTING
      this.dispatchEvent(new Event('error'))
    })

    await delay(this[kReconnectionTime])

    queueMicrotask(async () => {
      if (this.readyState !== this.CONNECTING) {
        return
      }

      if (this[kLastEventId] !== '') {
        this[kRequest].headers.set('last-event-id', this[kLastEventId])
      }

      await this.connect()
    })
  }

  private failConnection(): void {
    queueMicrotask(() => {
      if (this.readyState !== this.CLOSED) {
        this.readyState = this.CLOSED
        this.dispatchEvent(new Event('error'))
      }
    })
  }
}

/**
 * Checks if the given `Response` instance is a network error.
 * @see https://fetch.spec.whatwg.org/#concept-network-error
 */
function isNetworkError(response: Response): boolean {
  return (
    response.type === 'error' &&
    response.status === 0 &&
    response.statusText === '' &&
    Array.from(response.headers.entries()).length === 0 &&
    response.body === null
  )
}

const enum ControlCharacters {
  NewLine = 10,
  CarriageReturn = 13,
  Space = 32,
  Colon = 58,
}

interface EventSourceMessage {
  id?: string
  event?: string
  data?: string
  retry?: number
}

class EventSourceParsingStream extends WritableStream {
  private decoder: TextDecoder

  private buffer?: Uint8Array
  private position: number
  private fieldLength?: number
  private discardTrailingNewline = false

  private message: EventSourceMessage = {
    id: undefined,
    event: undefined,
    data: undefined,
    retry: undefined,
  }

  constructor(
    private underlyingSink: {
      message: (message: EventSourceMessage) => void
    },
  ) {
    super({
      write: (chunk) => {
        this.processResponseBodyChunk(chunk)
      },
    })

    this.decoder = new TextDecoder()
    this.position = 0
  }

  private resetMessage(): void {
    this.message = {
      id: undefined,
      event: undefined,
      data: undefined,
      retry: undefined,
    }
  }

  private processResponseBodyChunk(chunk: Uint8Array): void {
    if (this.buffer == null) {
      this.buffer = chunk
      this.position = 0
      this.fieldLength = -1
    } else {
      const nextBuffer = new Uint8Array(this.buffer.length + chunk.length)
      nextBuffer.set(this.buffer)
      nextBuffer.set(chunk, this.buffer.length)
      this.buffer = nextBuffer
    }

    const bufferLength = this.buffer.length
    let lineStart = 0

    while (this.position < bufferLength) {
      if (this.discardTrailingNewline) {
        if (this.buffer[this.position] === ControlCharacters.NewLine) {
          lineStart = ++this.position
        }

        this.discardTrailingNewline = false
      }

      let lineEnd = -1

      for (; this.position < bufferLength && lineEnd === -1; ++this.position) {
        switch (this.buffer[this.position]) {
          case ControlCharacters.Colon: {
            if (this.fieldLength === -1) {
              this.fieldLength = this.position - lineStart
            }
            break
          }

          case ControlCharacters.CarriageReturn: {
            this.discardTrailingNewline = true
          }
          case ControlCharacters.NewLine: {
            lineEnd = this.position
            break
          }
        }
      }

      if (lineEnd === -1) {
        break
      }

      this.processLine(
        this.buffer.subarray(lineStart, lineEnd),
        this.fieldLength!,
      )

      lineStart = this.position
      this.fieldLength = -1
    }

    if (lineStart === bufferLength) {
      this.buffer = undefined
    } else if (lineStart !== 0) {
      this.buffer = this.buffer.subarray(lineStart)
      this.position -= lineStart
    }
  }

  private processLine(line: Uint8Array, fieldLength: number): void {
    // New line indicates the end of the message. Dispatch it.
    if (line.length === 0) {
      this.underlyingSink.message(this.message)
      this.resetMessage()
      return
    }

    // Otherwise, keep accumulating message fields until the new line.
    if (fieldLength > 0) {
      const field = this.decoder.decode(line.subarray(0, fieldLength))
      const valueOffset =
        fieldLength +
        (line[fieldLength + 1] === ControlCharacters.Space ? 2 : 1)
      const value = this.decoder.decode(line.subarray(valueOffset))

      switch (field) {
        case 'data': {
          this.message.data = this.message.data
            ? this.message.data + '\n' + value
            : value
          break
        }

        case 'event': {
          this.message.event = value
          break
        }

        case 'id': {
          this.message.id = value
          break
        }

        case 'retry': {
          const retry = parseInt(value, 10)

          if (!isNaN(retry)) {
            this.message.retry = retry
          }
          break
        }
      }
    }
  }
}
