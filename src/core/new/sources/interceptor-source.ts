import {
  BatchInterceptor,
  Interceptor,
  HttpRequestEventMap,
  RequestController,
} from '@mswjs/interceptors'
import { NetworkSource } from './index'
import { HttpNetworkFrame } from '../frames/http-frame'

interface InterceptorSourceOptions {
  interceptors: Array<Interceptor<HttpRequestEventMap>>
}

/**
 * Create a network source from the given interceptors.
 */
export class InterceptorSource extends NetworkSource {
  #interceptor: BatchInterceptor<
    Array<Interceptor<HttpRequestEventMap>>,
    HttpRequestEventMap
  >

  constructor(options: InterceptorSourceOptions) {
    super()

    this.#interceptor = new BatchInterceptor({
      name: 'interceptor-source',
      interceptors: options.interceptors,
    })
  }

  public async enable(): Promise<void> {
    this.#interceptor.apply()

    this.#interceptor.on('request', ({ request, controller }) => {
      const httpFrame = new InterceptorHttpNetworkFrame({
        request,
        controller,
      })

      this.push(httpFrame)
    })
  }

  public async disable(): Promise<void> {
    await super.disable()
    this.#interceptor.dispose()
  }
}

class InterceptorHttpNetworkFrame extends HttpNetworkFrame {
  #controller: RequestController

  constructor(args: { request: Request; controller: RequestController }) {
    super({
      request: args.request,
    })

    this.#controller = args.controller
  }

  public respondWith(response?: Response): void {
    if (response) {
      this.#controller.respondWith(response)
    }
  }

  public errorWith(reason?: unknown): void {
    if (reason instanceof Response) {
      return this.respondWith(reason)
    }

    this.#controller.errorWith(reason as any)
  }

  public passthrough(): void {
    return
  }
}
