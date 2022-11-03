import {
  BatchInterceptor,
  HttpRequestEventMap,
  Interceptor,
} from '@mswjs/interceptors'
import { EventMapType, StrictEventEmitter } from 'strict-event-emitter'
import {
  DefaultBodyType,
  RequestHandler,
  RequestHandlerDefaultInfo,
} from './handlers/RequestHandler'
import { LifeCycleEventEmitter } from './sharedOptions'
import { devUtils } from './utils/internal/devUtils'
import { pipeEvents } from './utils/internal/pipeEvents'
import { toReadonlyArray } from './utils/internal/toReadonlyArray'
import { MockedRequest } from './utils/request/MockedRequest'

/**
 * Generic class for the mock API setup
 */
export abstract class SetupApi<EventsMap extends EventMapType> {
  protected readonly interceptor: BatchInterceptor<
    Array<Interceptor<HttpRequestEventMap>>,
    HttpRequestEventMap
  >
  protected readonly initialHandlers: Array<RequestHandler>
  protected currentHandlers: Array<RequestHandler>
  protected readonly emitter = new StrictEventEmitter<EventsMap>()
  protected readonly publicEmitter = new StrictEventEmitter<EventsMap>()

  public readonly events: LifeCycleEventEmitter<EventsMap>

  constructor(
    interceptors: Array<{
      new (): Interceptor<HttpRequestEventMap>
    }>,
    protected readonly interceptorName: string,
    initialHandlers: Array<RequestHandler>,
  ) {
    initialHandlers.forEach((handler) => {
      if (Array.isArray(handler))
        throw new Error(
          devUtils.formatMessage(
            `Failed to call "${this.constructor.name}" given an Array of request handlers (${this.constructor.name}([a, b])), expected to receive each handler individually: ${this.constructor.name}(a, b).`,
          ),
        )
    })

    /**
     * @todo Not all "setup*" APIs rely on interceptors.
     * Consider moving this away to the child class.
     */
    this.interceptor = new BatchInterceptor({
      name: interceptorName,
      interceptors: interceptors.map((Interceptor) => new Interceptor()),
    })
    this.initialHandlers = [...initialHandlers]
    this.currentHandlers = [...initialHandlers]

    pipeEvents(this.emitter, this.publicEmitter)
    this.events = this.registerEvents()
  }

  protected apply(): void {
    this.interceptor.apply()
  }

  protected dispose(): void {
    this.emitter.removeAllListeners()
    this.publicEmitter.removeAllListeners()
    this.interceptor.dispose()
  }

  public use(...runtimeHandlers: Array<RequestHandler>): void {
    this.currentHandlers.unshift(...runtimeHandlers)
  }

  public restoreHandlers(): void {
    this.currentHandlers.forEach((handler) => {
      handler.markAsSkipped(false)
    })
  }

  public resetHandlers(...nextHandlers: Array<RequestHandler>): void {
    this.currentHandlers =
      nextHandlers.length > 0 ? [...nextHandlers] : [...this.initialHandlers]
  }

  public listHandlers(): ReadonlyArray<
    RequestHandler<
      RequestHandlerDefaultInfo,
      MockedRequest<DefaultBodyType>,
      any,
      MockedRequest<DefaultBodyType>
    >
  > {
    return toReadonlyArray(this.currentHandlers)
  }

  private registerEvents(): LifeCycleEventEmitter<EventsMap> {
    return {
      on: (...args) => {
        return this.publicEmitter.on(...args)
      },
      removeListener: (...args) => {
        return this.publicEmitter.removeListener(...args)
      },
      removeAllListeners: (...args: any) => {
        return this.publicEmitter.removeAllListeners(...args)
      },
    }
  }

  abstract printHandlers(): void
}
