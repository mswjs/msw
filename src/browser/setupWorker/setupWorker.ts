import { invariant } from 'outvariant'
import { isNodeProcess } from 'is-node-process'
import type {
  SetupWorkerInternalContext,
  StartReturnType,
  StopHandler,
  StartHandler,
  StartOptions,
  SetupWorker,
} from './glossary'
import { createStartHandler } from './start/createStartHandler'
import { createStop } from './stop/createStop'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { DEFAULT_START_OPTIONS } from './start/utils/prepareStartHandler'
import { createFallbackStart } from './start/createFallbackStart'
import { createFallbackStop } from './stop/createFallbackStop'
import { devUtils } from '~/core/utils/internal/devUtils'
import { SetupApi } from '~/core/SetupApi'
import { mergeRight } from '~/core/utils/internal/mergeRight'
import type { LifeCycleEventsMap } from '~/core/sharedOptions'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import { supportsReadableStreamTransfer } from '../utils/supportsReadableStreamTransfer'
import { webSocketInterceptor } from '~/core/ws/webSocketInterceptor'
import { handleWebSocketEvent } from '~/core/ws/handleWebSocketEvent'
import { attachWebSocketLogger } from '~/core/ws/utils/attachWebSocketLogger'
import { WorkerChannel } from '../utils/workerChannel'
import { DeferredPromise } from '@open-draft/deferred-promise'

interface Listener {
  target: EventTarget
  eventType: string
  callback: EventListenerOrEventListenerObject
}

export class SetupWorkerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupWorker
{
  private context: SetupWorkerInternalContext
  private startHandler: StartHandler = null as any
  private stopHandler: StopHandler = null as any
  private listeners: Array<Listener>

  constructor(...handlers: Array<RequestHandler | WebSocketHandler>) {
    super(...handlers)

    invariant(
      !isNodeProcess(),
      devUtils.formatMessage(
        'Failed to execute `setupWorker` in a non-browser environment. Consider using `setupServer` for Node.js environment instead.',
      ),
    )

    this.listeners = []
    this.context = this.createWorkerContext()
  }

  private createWorkerContext(): SetupWorkerInternalContext {
    const workerPromise = new DeferredPromise<ServiceWorker>()
    const context: SetupWorkerInternalContext = {
      // Mocking is not considered enabled until the worker
      // signals back the successful activation event.
      isMockingEnabled: false,
      startOptions: null as any,
      workerPromise,
      getRequestHandlers: () => {
        return this.handlersController.currentHandlers()
      },
      registration: null,
      emitter: this.emitter,
      workerChannel: new WorkerChannel({
        worker: workerPromise,
      }),
      supports: {
        serviceWorkerApi:
          !('serviceWorker' in navigator) || location.protocol === 'file:',
        readableStreamTransfer: supportsReadableStreamTransfer(),
      },
    }

    this.startHandler = context.supports.serviceWorkerApi
      ? createFallbackStart(context)
      : createStartHandler(context)

    this.stopHandler = context.supports.serviceWorkerApi
      ? createFallbackStop(context)
      : createStop(context)

    return context
  }

  public async start(options: StartOptions = {}): StartReturnType {
    if (options.waitUntilReady === true) {
      devUtils.warn(
        'The "waitUntilReady" option has been deprecated. Please remove it from this "worker.start()" call. Follow the recommended Browser integration (https://mswjs.io/docs/integrations/browser) to eliminate any race conditions between the Service Worker registration and any requests made by your application on initial render.',
      )
    }

    this.context.startOptions = mergeRight(
      DEFAULT_START_OPTIONS,
      options,
    ) as SetupWorkerInternalContext['startOptions']

    // Enable the WebSocket interception.
    handleWebSocketEvent({
      getUnhandledRequestStrategy: () => {
        return this.context.startOptions.onUnhandledRequest
      },
      getHandlers: () => {
        return this.handlersController.currentHandlers()
      },
      onMockedConnection: (connection) => {
        if (!this.context.startOptions.quiet) {
          // Attach the logger for mocked connections since
          // those won't be visible in the browser's devtools.
          attachWebSocketLogger(connection)
        }
      },
      onPassthroughConnection() {},
    })
    webSocketInterceptor.apply()

    this.subscriptions.push(() => {
      webSocketInterceptor.dispose()
    })

    return await this.startHandler(this.context.startOptions, options)
  }

  public stop(): void {
    super.dispose()
    this.stopHandler()
  }
}

/**
 * Sets up a requests interception in the browser with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-worker `setupWorker()` API reference}
 */
export function setupWorker(
  ...handlers: Array<RequestHandler | WebSocketHandler>
): SetupWorker {
  return new SetupWorkerApi(...handlers)
}
