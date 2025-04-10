import * as http from 'node:http'
import { Readable } from 'node:stream'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { FetchResponse } from '@mswjs/interceptors'
import { invariant } from 'outvariant'
import type { LifeCycleEventsMap } from './sharedOptions'
import { bypass } from './bypass'
import { delay } from './delay'

export type ForwardedLifeCycleEventPayload = {
  type: keyof LifeCycleEventsMap
  args: {
    requestId: string
    request: {
      method: string
      url: string
      headers: Array<[string, string]>
      body: Uint8Array | null
    }
    response?: {
      status: number
      statusText: string
      headers: Array<[string, string]>
      body: Uint8Array | null
    }
    error?: {
      name: string
      message: string
      stack?: string
    }
  }
}

export class RemoteClient {
  public connected: boolean

  protected agent: http.Agent

  constructor(private readonly url: URL) {
    this.agent = new http.Agent({
      // Reuse the same socket between requests so we can communicate
      // request's life-cycle events via HTTP more efficiently.
      keepAlive: true,
    })
    this.connected = false
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    const maxRetries = 4
    let retries = 0

    const tryConnect = (): Promise<void> => {
      const connectionPromise = new DeferredPromise<void>()

      const request = http
        .request(this.url, {
          agent: this.agent,
          method: 'HEAD',
          headers: {
            accept: 'msw/passthrough',
          },
          timeout: 1000,
        })
        .end()

      request
        .once('response', (response) => {
          if (response.statusCode === 200) {
            connectionPromise.resolve()
          } else {
            connectionPromise.reject()
          }
        })
        .once('error', () => {
          connectionPromise.reject()
        })
        .once('timeout', () => {
          connectionPromise.reject()
        })

      return connectionPromise.then(
        () => {
          this.connected = true
        },
        async () => {
          invariant(
            retries < maxRetries,
            'Failed to connect to the remote server after %s retries',
            maxRetries,
          )

          retries++
          request.removeAllListeners()
          return delay(500).then(() => tryConnect())
        },
      )
    }

    return tryConnect()
  }

  public async handleRequest(args: {
    requestId: string
    boundaryId: string
    request: Request
  }): Promise<Response | undefined> {
    invariant(
      this.connected,
      'Failed to handle request "%s %s": client is not connected',
      args.request.method,
      args.request.url,
    )

    const fetchRequest = bypass(args.request, {
      headers: {
        accept: 'msw/internal',
        'x-msw-request-url': args.request.url,
        'x-msw-request-id': args.requestId,
        'x-msw-boundary-id': args.boundaryId,
      },
    })
    const request = http.request(this.url, {
      method: fetchRequest.method,
      headers: Object.fromEntries(fetchRequest.headers),
    })

    if (fetchRequest.body) {
      Readable.fromWeb(fetchRequest.body as any).pipe(request, { end: true })
    } else {
      request.end()
    }

    const responsePromise = new DeferredPromise<Response | undefined>()

    request
      .once('response', (response) => {
        if (response.statusCode === 404) {
          responsePromise.resolve(undefined)
          return
        }

        const fetchResponse = new FetchResponse(
          /** @fixme Node.js types incompatibility */
          Readable.toWeb(response) as ReadableStream<any>,
          {
            url: fetchRequest.url,
            status: response.statusCode,
            statusText: response.statusMessage,
            headers: FetchResponse.parseRawHeaders(response.rawHeaders),
          },
        )
        responsePromise.resolve(fetchResponse)
      })
      .once('error', () => {
        responsePromise.resolve(undefined)
      })
      .once('timeout', () => {
        responsePromise.resolve(undefined)
      })

    return responsePromise
  }

  public async handleLifeCycleEvent<
    EventType extends keyof LifeCycleEventsMap,
  >(event: {
    type: EventType
    args: LifeCycleEventsMap[EventType][0]
  }): Promise<void> {
    invariant(
      this.connected,
      'Failed to forward life-cycle events for "%s %s": remote client not connected',
      event.args.request.method,
      event.args.request.url,
    )

    const url = new URL('/life-cycle-events', this.url)
    const payload = JSON.stringify({
      type: event.type,
      args: {
        requestId: event.args.requestId,
        request: await serializeFetchRequest(event.args.request),
        response:
          'response' in event.args
            ? await serializeFetchResponse(event.args.response)
            : undefined,
        error:
          'error' in event.args ? serializeError(event.args.error) : undefined,
      },
    } satisfies ForwardedLifeCycleEventPayload)

    invariant(
      payload,
      'Failed to serialize a life-cycle event "%s" for request "%s %s"',
      event.type,
      event.args.request.method,
      event.args.request.url,
    )

    const donePromise = new DeferredPromise<void>()

    http
      .request(
        url,
        {
          method: 'POST',
          headers: {
            accept: 'msw/passthrough, msw/internal',
            'content-type': 'application/json',
          },
        },
        (response) => {
          if (response.statusCode === 200) {
            donePromise.resolve()
          } else {
            donePromise.reject(
              new Error(
                `Failed to forward life-cycle event "${event.type}" for request "${event.args.request.method} ${event.args.request.url}": expected a 200 response but got ${response.statusCode}`,
              ),
            )
          }
        },
      )
      .end(payload)
      .once('error', (error) => {
        // eslint-disable-next-line no-console
        console.error(error)
        donePromise.reject(
          new Error(
            `Failed to forward life-cycle event "${event.type}" for request "${event.args.request.method} ${event.args.request.url}": unexpected error. There's likely additional information above.`,
          ),
        )
      })

    return donePromise
  }
}

export async function serializeFetchRequest(
  request: Request,
): Promise<ForwardedLifeCycleEventPayload['args']['request']> {
  return {
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers),
    body: request.body
      ? new Uint8Array(await request.clone().arrayBuffer())
      : null,
  }
}

export function deserializeFetchRequest(
  value: NonNullable<ForwardedLifeCycleEventPayload['args']['request']>,
): Request {
  return new Request(value.url, {
    method: value.method,
    headers: value.headers,
    body: value.body,
  })
}

async function serializeFetchResponse(
  response: Response,
): Promise<ForwardedLifeCycleEventPayload['args']['response']> {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers),
    body: response.body
      ? new Uint8Array(await response.clone().arrayBuffer())
      : null,
  }
}

export function deserializeFetchResponse(
  value: NonNullable<ForwardedLifeCycleEventPayload['args']['response']>,
): Response {
  return new FetchResponse(
    value.body ? new Uint8Array(Object.values(value.body)) : null,
    {
      status: value.status,
      statusText: value.statusText,
      headers: value.headers,
    },
  )
}

export function serializeError(
  error: Error,
): ForwardedLifeCycleEventPayload['args']['error'] {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  }
}

export function deserializeError(
  value: NonNullable<ForwardedLifeCycleEventPayload['args']['error']>,
): Error {
  const error = new Error(value.message)
  error.name = value.name
  error.stack = value.stack
  return error
}
