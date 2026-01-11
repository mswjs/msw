import type { PartialDeep } from 'type-fest'
import { Interceptor } from '@mswjs/interceptors'
import { ListenOptions, SetupServerCommon } from './glossary'
import {
  AnyHandler,
  defineNetwork,
  LifeCycleEventsMap,
  NetworkApi,
} from '~/core'
import { HandlersController } from '~/core/new/handlers-controller'
import { InterceptorSource } from '~/core/new/sources/interceptor-source'
import {
  fromLegacyOnUnhandledRequest,
  toLegacyEmitter,
} from '~/core/new/compat'

export class SetupServerCommonApi implements SetupServerCommon {
  #listenOptions?: PartialDeep<ListenOptions>

  protected network: NetworkApi

  constructor(
    interceptors: Array<Interceptor<any>>,
    handlers: Array<AnyHandler>,
    handlersController?: HandlersController,
  ) {
    this.network = defineNetwork({
      sources: [new InterceptorSource({ interceptors })],
      handlers,
      controller: handlersController,
      onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
        return this.#listenOptions?.onUnhandledRequest || 'warn'
      }),
    })
  }

  get events() {
    return toLegacyEmitter<LifeCycleEventsMap>(this.network.events)
  }

  public listen(options?: PartialDeep<ListenOptions>): void {
    this.#listenOptions = options
    this.network.enable()
  }

  public use(...handlers: Array<AnyHandler>): void {
    this.network.use(...handlers)
  }

  public resetHandlers(...nextHandlers: Array<AnyHandler>): void {
    return this.network.resetHandlers(...nextHandlers)
  }

  public restoreHandlers(): void {
    return this.network.restoreHandlers()
  }

  public listHandlers(): ReadonlyArray<AnyHandler> {
    return this.network.listHandlers()
  }

  public close(): void {
    this.network.disable()
  }
}
