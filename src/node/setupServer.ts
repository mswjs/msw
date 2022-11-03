import {
  IsomorphicResponse,
  MockedResponse as MockedInterceptedResponse,
} from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/XMLHttpRequest'
import { SetupApi } from '../SetupApi'
import { RequestHandler } from '../handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '../sharedOptions'
import { RequiredDeep } from '../typeUtils'
import { mergeRight } from '../utils/internal/mergeRight'
import { bold } from 'chalk'
import { MockedRequest } from '../utils/request/MockedRequest'
import { handleRequest } from '../utils/handleRequest'

export type ServerLifecycleEventsMap = LifeCycleEventsMap<IsomorphicResponse>

const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

/**
 * Concrete class to implement the SetupApi for the node server environment, uses both the ClientRequestInterceptor
 * and XMLHttpRequestInterceptor.
 */
export class SetupServerApi extends SetupApi<ServerLifecycleEventsMap> {
  private resolvedOptions: RequiredDeep<SharedOptions>

  constructor(handlers: Array<RequestHandler>) {
    super(
      [ClientRequestInterceptor, XMLHttpRequestInterceptor],
      'setup-server',
      handlers,
    )

    this.resolvedOptions = {} as RequiredDeep<SharedOptions>

    this.init()
  }

  /**
   * Subscribe to all requests that are using the interceptor object
   */
  public async init(): Promise<void> {
    this.interceptor.on('request', async (request) => {
      const mockedRequest = new MockedRequest(request.url, {
        ...request,
        body: await request.arrayBuffer(),
      })

      const response = await handleRequest<
        MockedInterceptedResponse & { delay?: number }
      >(
        mockedRequest,
        this.currentHandlers,
        this.resolvedOptions,
        this.emitter,
        {
          transformResponse(response) {
            return {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers.all(),
              body: response.body,
              delay: response.delay,
            }
          },
        },
      )

      if (response) {
        // Delay Node.js responses in the listener so that
        // the response lookup logic is not concerned with responding
        // in any way. The same delay is implemented in the worker.
        if (response.delay) {
          await new Promise((resolve) => {
            setTimeout(resolve, response.delay)
          })
        }

        request.respondWith(response)
      }

      return
    })

    this.interceptor.on('response', (request, response) => {
      if (!request.id) {
        return
      }

      if (response.headers.get('x-powered-by') === 'msw') {
        this.emitter.emit('response:mocked', response, request.id)
      } else {
        this.emitter.emit('response:bypass', response, request.id)
      }
    })
  }

  public listen(options: Record<string, any> = {}): void {
    this.resolvedOptions = mergeRight(
      DEFAULT_LISTEN_OPTIONS,
      options,
    ) as RequiredDeep<SharedOptions>

    super.apply()
  }

  public printHandlers(): void {
    const handlers = this.listHandlers()

    handlers.forEach((handler) => {
      const { header, callFrame } = handler.info

      const pragma = handler.info.hasOwnProperty('operationType')
        ? '[graphql]'
        : '[rest]'

      console.log(`\
${bold(`${pragma} ${header}`)}
  Declaration: ${callFrame}
`)
    })
  }

  public close(): void {
    super.dispose()
  }
}

/**
 * Sets up a requests interception in Node.js with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer`}
 */
export const setupServer = (
  ...handlers: Array<RequestHandler>
): SetupServerApi => {
  return new SetupServerApi(handlers)
}
