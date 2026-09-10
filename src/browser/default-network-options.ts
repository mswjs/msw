import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import type { DefineNetworkOptions } from '#core/experimental/define-network'
import {
  InterceptorSource,
  type InterceptorSourceOptions,
} from '#core/experimental/sources/interceptor-source'
import { ServiceWorkerSource } from './sources/service-worker-source'
import { FallbackHttpSource } from './sources/fallback-http-source'
import { supportsServiceWorker } from './utils/supports'

export function createDefaultNetworkOptions(
  workerUrl = '/mockServiceWorker.js',
): DefineNetworkOptions<
  [ServiceWorkerSource | FallbackHttpSource, InterceptorSource]
> {
  return {
    sources: [
      supportsServiceWorker()
        ? new ServiceWorkerSource({ serviceWorker: { url: workerUrl } })
        : new FallbackHttpSource({}),
      new InterceptorSource({
        interceptors: [
          new WebSocketInterceptor() as InterceptorSourceOptions['interceptors'][number],
        ],
      }),
    ],
    onUnhandledFrame: 'warn',
  }
}

export const defaultNetworkOptions = createDefaultNetworkOptions()
