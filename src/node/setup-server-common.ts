import type { PartialDeep } from 'type-fest'
import type { Interceptor } from '@mswjs/interceptors'
import {
  defineNetwork,
  type NetworkApi,
} from '#core/experimental/define-network'
import type { AnyHandler } from '#core/experimental/handlers-controller'
import type { HandlersController } from '#core/experimental/handlers-controller'
import { InterceptorSource } from '#core/experimental/sources/interceptor-source'
import { fromLegacyOnUnhandledRequest } from '#core/experimental/compat'
import type { ListenOptions, SetupServerCommon } from './glossary'
export { defineSetupServerApi } from '#core/experimental/setup-server-api'

/**
 * @deprecated
 * Please use the `defineNetwork` API instead.
 */
export class SetupServerCommonApi implements SetupServerCommon {
  protected network: NetworkApi<[InterceptorSource]>

  constructor(
    interceptors: Array<Interceptor<any>>,
    handlers: Array<AnyHandler> | HandlersController,
  ) {
    this.network = defineNetwork({
      sources: [new InterceptorSource({ interceptors })],
      handlers,
    })
  }

  get events() {
    return this.network.events
  }

  public listen(options?: PartialDeep<ListenOptions>): void {
    this.network.configure({
      onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
        return options?.onUnhandledRequest || 'warn'
      }),
    })

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
