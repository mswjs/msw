import { AsyncLocalStorage } from 'node:async_hooks'
import * as http from 'node:http'
import type { HttpRequestEventMap, Interceptor } from '@mswjs/interceptors'
import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { HandlersController } from '~/core/SetupApi'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import type { SharedOptions } from '~/core/sharedOptions'
import type { SetupServer } from './glossary'
import { SetupServerCommonApi } from './SetupServerCommonApi'

const store = new AsyncLocalStorage<RequestHandlersContext>()

type RequestHandlersContext = {
  initialHandlers: Array<RequestHandler | WebSocketHandler>
  handlers: Array<RequestHandler | WebSocketHandler>
}

const kDestroyError = Symbol('msw:client-request-destroy-error')

let originalClientRequestDestroy:
  | typeof http.ClientRequest.prototype.destroy
  | undefined
let originalClientRequestEmit:
  | typeof http.ClientRequest.prototype.emit
  | undefined
let clientRequestPatchRefCount = 0

function isCanceledConnectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const errorLike = error as any

  return (
    errorLike.code === 'ECANCELED' ||
    (typeof errorLike.message === 'string' &&
      errorLike.message.includes('ECANCELED'))
  )
}

function acquireClientRequestDestroyPatch(): void {
  clientRequestPatchRefCount++

  if (clientRequestPatchRefCount > 1) {
    return
  }

  originalClientRequestDestroy = http.ClientRequest.prototype.destroy
  originalClientRequestEmit = http.ClientRequest.prototype.emit

  http.ClientRequest.prototype.destroy = function destroy(
    this: http.ClientRequest,
    error?: Error,
  ): http.ClientRequest {
    if (error && !(this as any)[kDestroyError]) {
      ;(this as any)[kDestroyError] = error
    }

    return originalClientRequestDestroy!.call(this, error as any)
  }

  http.ClientRequest.prototype.emit = function emit(
    this: http.ClientRequest,
    event: string,
    ...args: Array<any>
  ): boolean {
    if (event === 'error') {
      const error = args[0]
      const destroyError = (this as any)[kDestroyError] as Error | undefined

      if (
        destroyError &&
        error !== destroyError &&
        isCanceledConnectError(error)
      ) {
        return false
      }
    }

    return originalClientRequestEmit!.call(this, event as any, ...args)
  }
}

function releaseClientRequestDestroyPatch(): void {
  clientRequestPatchRefCount = Math.max(0, clientRequestPatchRefCount - 1)

  if (clientRequestPatchRefCount > 0) {
    return
  }

  if (originalClientRequestDestroy) {
    http.ClientRequest.prototype.destroy = originalClientRequestDestroy
    originalClientRequestDestroy = undefined
  }

  if (originalClientRequestEmit) {
    http.ClientRequest.prototype.emit = originalClientRequestEmit
    originalClientRequestEmit = undefined
  }
}

/**
 * A handlers controller that utilizes `AsyncLocalStorage` in Node.js
 * to prevent the request handlers list from being a shared state
 * across multiple tests.
 */
class AsyncHandlersController implements HandlersController {
  private rootContext: RequestHandlersContext

  constructor(initialHandlers: Array<RequestHandler | WebSocketHandler>) {
    this.rootContext = { initialHandlers, handlers: [] }
  }

  get context(): RequestHandlersContext {
    return store.getStore() || this.rootContext
  }

  public prepend(runtimeHandlers: Array<RequestHandler | WebSocketHandler>) {
    this.context.handlers.unshift(...runtimeHandlers)
  }

  public reset(nextHandlers: Array<RequestHandler | WebSocketHandler>) {
    const context = this.context
    context.handlers = []
    context.initialHandlers =
      nextHandlers.length > 0 ? nextHandlers : context.initialHandlers
  }

  public currentHandlers(): Array<RequestHandler | WebSocketHandler> {
    const { initialHandlers, handlers } = this.context
    return handlers.concat(initialHandlers)
  }
}
export class SetupServerApi
  extends SetupServerCommonApi
  implements SetupServer
{
  constructor(
    handlers: Array<RequestHandler | WebSocketHandler>,
    interceptors: Array<Interceptor<HttpRequestEventMap>> = [
      new ClientRequestInterceptor(),
      new XMLHttpRequestInterceptor(),
      new FetchInterceptor(),
    ],
  ) {
    super(interceptors, handlers)

    this.handlersController = new AsyncHandlersController(handlers)
  }

  public listen(options: Partial<SharedOptions> = {}): void {
    super.listen(options)
    acquireClientRequestDestroyPatch()
    this.subscriptions.push(() => releaseClientRequestDestroyPatch())
  }

  public boundary<Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ): (...args: Args) => R {
    return (...args: Args): R => {
      return store.run<any, any>(
        {
          initialHandlers: this.handlersController.currentHandlers(),
          handlers: [],
        },
        callback,
        ...args,
      )
    }
  }

  public close(): void {
    super.close()
    store.disable()
  }
}
