import type { PartialDeep } from 'type-fest'
import { Interceptor } from '@mswjs/interceptors'
import type { ListenOptions, SetupServerCommon } from './glossary'
import { type NetworkApi, defineNetwork } from '~/core/new/define-network'
import { type AnyHandler } from '~/core/new/handlers-controller'
import { HandlersController } from '~/core/new/handlers-controller'
import { InterceptorSource } from '~/core/new/sources/interceptor-source'
import { fromLegacyOnUnhandledRequest } from '~/core/new/compat'

export class SetupServerCommonApi implements SetupServerCommon {
  #listenOptions?: PartialDeep<ListenOptions>

  protected network: NetworkApi<any>

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
      context: {
        quiet: true,
      },
    })
  }

  get events() {
    return this.network.events as any
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
