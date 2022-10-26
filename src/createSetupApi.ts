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
import { pipeEvents } from './utils/internal/pipeEvents'
import { toReadonlyArray } from './utils/internal/toReadonlyArray'
import { MockedRequest } from './utils/request/MockedRequest'

/**
 * Generic class for the mock API setup
 */
export abstract class SetupApi<TLifecycleEventsMap extends EventMapType> {
  private readonly initialHandlers: RequestHandler[]

  protected readonly interceptor: BatchInterceptor<
    Interceptor<HttpRequestEventMap>[],
    HttpRequestEventMap
  >
  protected readonly emitter = new StrictEventEmitter<TLifecycleEventsMap>()
  protected readonly publicEmitter =
    new StrictEventEmitter<TLifecycleEventsMap>()
  protected currentHandlers: RequestHandler[]

  public readonly events: LifeCycleEventEmitter<Record<string | symbol, any>>

  constructor(
    interceptors: {
      new (): Interceptor<HttpRequestEventMap>
    }[],
    initialHandlers: RequestHandler[],
  ) {
    this.interceptor = new BatchInterceptor({
      name: 'setup-api',
      interceptors: interceptors.map((Interceptor) => new Interceptor()),
    })
    // Clone
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

  public use(...runtimeHandlers: RequestHandler[]): void {
    this.currentHandlers.unshift(...runtimeHandlers)
  }

  public restoreHandlers(): void {
    this.currentHandlers.forEach((handler) => {
      handler.markAsSkipped(false)
    })
  }

  public resetHandlers(...nextHandlers: RequestHandler[]) {
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

  private registerEvents(): LifeCycleEventEmitter<
    Record<string | symbol, any>
  > {
    return {
      on: (evt: any, listener: any) => {
        return this.publicEmitter.on(evt, listener)
      },
      removeListener: (evt: any, listener: any) => {
        return this.publicEmitter.removeListener(evt, listener)
      },
      removeAllListeners: (...args: any) => {
        return this.publicEmitter.removeAllListeners(...args)
      },
    }
  }

  abstract printHandlers(): void
}
