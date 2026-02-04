import type { PartialDeep } from 'type-fest'
import { Interceptor } from '@mswjs/interceptors'
import { type NetworkApi, defineNetwork } from '#core/new/define-network'
import { type AnyHandler } from '#core/new/handlers-controller'
import { HandlersController } from '#core/new/handlers-controller'
import { InterceptorSource } from '#core/new/sources/interceptor-source'
import { fromLegacyOnUnhandledRequest } from '#core/new/compat'
import type { ListenOptions, SetupServerCommon } from './glossary'

export function createSetupServerCommonApi(
  network: NetworkApi<any>,
): SetupServerCommon {
  return {
    events: network.events,
    listen(options) {
      network.configure({
        onUnhandledFrame: fromLegacyOnUnhandledRequest(() => {
          return options?.onUnhandledRequest || 'warn'
        }),
      })

      network.enable()
    },
    use: network.use.bind(network),
    resetHandlers: network.resetHandlers.bind(network),
    restoreHandlers: network.restoreHandlers.bind(network),
    listHandlers: network.listHandlers.bind(network),
    close() {
      network.disable()
    },
  }
}

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
    return this.network.events as any
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
