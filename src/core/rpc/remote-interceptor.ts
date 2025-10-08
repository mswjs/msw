import {
  Interceptor,
  RequestController,
  createRequestId,
  handleRequest,
  type HttpRequestEventMap,
} from '@mswjs/interceptors'
import { RpcServer } from './server'

interface RemoteInterceptorOptions {
  port: number
}

export class RemoteInterceptor extends Interceptor<HttpRequestEventMap> {
  static symbol = Symbol('remote-interceptor')

  constructor(private readonly options: RemoteInterceptorOptions) {
    super(RemoteInterceptor.symbol)

    this.#server = new RpcServer()
  }

  public async apply(): Promise<void> {
    await this.#server.listen(this.options.port)

    this.#server.on('request', (event) => {
      const { request } = event.data
      const controller = new RequestController(request)

      await handleRequest()

      /** @todo Finish this and return a response or undefined */
    })
  }

  async dispose(): Promise<void> {
    super.dispose()

    /**
     * @note Introduce a custom async `dispose()` because `Interceptor`
     * does not await the subscriptions.
     */
    await this.#server.close()
  }
}
