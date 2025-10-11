import type { Interceptor } from '@mswjs/interceptors'
import { defineNetwork, type NetworkApi } from '~/core/new/define-network'
import type {
  AnyHandler,
  HandlersController,
} from '~/core/new/handlers-controller'
import { InterceptorSource } from '~/core/new/sources/interceptor-source'
import type { SetupServerCommon } from './glossary'

export class SetupServerCommonApi implements SetupServerCommon {
  protected network: NetworkApi<AnyHandler>

  public events: SetupServerCommon['events']
  public use: SetupServerCommon['use']
  public resetHandlers: SetupServerCommon['resetHandlers']
  public restoreHandlers: SetupServerCommon['restoreHandlers']
  public listHandlers: SetupServerCommon['listHandlers']

  constructor(
    interceptors: Array<Interceptor<any>> = [],
    handlers: Array<AnyHandler>,
    handlersController?: HandlersController<AnyHandler>,
  ) {
    this.network = defineNetwork({
      sources: [
        new InterceptorSource({
          interceptors,
        }),
      ],
      handlers,
      handlersController,
    })

    /**
     * @fixme This expects a readonly emitter (subset of methods).
     */
    this.events = this.network.events as any
    this.use = this.network.use.bind(this.network)
    this.resetHandlers = this.network.resetHandlers.bind(this.network)
    this.restoreHandlers = this.network.restoreHandlers.bind(this.network)
    this.listHandlers = this.network.listHandlers.bind(this.network)
  }

  public listen(
    // eslint-disable-next-line
    ...args: Array<any>
  ): void {
    this.network.enable()
  }

  public close(): void {
    this.network.disable()
  }
}
