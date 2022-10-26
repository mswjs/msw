import { ClientRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/lib/interceptors/XMLHttpRequest'
import { SetupApi } from '../createSetupApi'
import { RequestHandler } from '../handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '../sharedOptions'
import { RequiredDeep } from '../typeUtils'
import { mergeRight } from '../utils/internal/mergeRight'
import { bold } from 'chalk'
import { MockedRequest } from '../utils/request/MockedRequest'
import { handleRequest } from '../utils/handleRequest'
import {
  IsomorphicResponse,
  MockedResponse as MockedInterceptedResponse,
} from '@mswjs/interceptors'
import { devUtils } from '../utils/internal/devUtils'
/**
 * Sets up a requests interception in Node.js with the given request handlers.
 * @param {RequestHandler[]} requestHandlers List of request handlers.
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer`}
 */
// export const setupServer = createSetupServer(
//   // List each interceptor separately instead of using the "node" preset
//   // so that MSW wouldn't bundle the unnecessary classes (i.e. "SocketPolyfill").
//   ClientRequestInterceptor,
//   XMLHttpRequestInterceptor,
// )

export type ServerLifecycleEventsMap = LifeCycleEventsMap<IsomorphicResponse>

const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

export class SetupServerApi extends SetupApi<ServerLifecycleEventsMap> {
  private resolvedOptions: RequiredDeep<SharedOptions>

  constructor(handlers: RequestHandler[]) {
    super([ClientRequestInterceptor, XMLHttpRequestInterceptor], handlers)

    this.resolvedOptions = {} as RequiredDeep<SharedOptions>

    // TODO: Re-think this
    this.init()
  }

  public async init(): Promise<void> {
    const _self = this

    this.interceptor.on('request', async function setupServerListener(request) {
      const mockedRequest = new MockedRequest(request.url, {
        ...request,
        body: await request.arrayBuffer(),
      })

      const response = await handleRequest<
        MockedInterceptedResponse & { delay?: number }
      >(
        mockedRequest,
        _self.currentHandlers,
        _self.resolvedOptions,
        _self.emitter,
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
        _self.emitter.emit('response:mocked', response, request.id)
      } else {
        _self.emitter.emit('response:bypass', response, request.id)
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

  public printHandlers() {
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

export const setupServer = (...handlers: RequestHandler[]) => {
  handlers.forEach((handler) => {
    if (Array.isArray(handler))
      throw new Error(
        devUtils.formatMessage(
          'Failed to call "setupServer" given an Array of request handlers (setupServer([a, b])), expected to receive each handler individually: setupServer(a, b).',
        ),
      )
  })
  return new SetupServerApi(handlers)
}
