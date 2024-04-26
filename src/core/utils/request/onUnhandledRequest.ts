import { toPublicUrl } from './toPublicUrl'
import { InternalError, devUtils } from '../internal/devUtils'

export interface UnhandledRequestPrint {
  warning(): void
  error(): void
}

export type UnhandledRequestCallback = (
  request: Request,
  print: UnhandledRequestPrint,
) => void

export type UnhandledRequestStrategy =
  | 'bypass'
  | 'warn'
  | 'error'
  | UnhandledRequestCallback

export async function onUnhandledRequest(
  request: Request,
  strategy: UnhandledRequestStrategy = 'warn',
): Promise<void> {
  const url = new URL(request.url)
  const publicUrl = toPublicUrl(url) + url.search

  const unhandledRequestMessage = `intercepted a request without a matching request handler:\n\n  \u2022 ${request.method} ${publicUrl}\n\nIf you still wish to intercept this unhandled request, please create a request handler for it.\nRead more: https://mswjs.io/docs/getting-started/mocks`

  function applyStrategy(strategy: UnhandledRequestStrategy) {
    switch (strategy) {
      case 'error': {
        // Print a developer-friendly error.
        devUtils.error('Error: %s', unhandledRequestMessage)

        // Throw an exception to halt request processing and not perform the original request.
        throw new InternalError(
          devUtils.formatMessage(
            'Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
          ),
        )
      }

      case 'warn': {
        devUtils.warn('Warning: %s', unhandledRequestMessage)
        break
      }

      case 'bypass':
        break

      default:
        throw new InternalError(
          devUtils.formatMessage(
            'Failed to react to an unhandled request: unknown strategy "%s". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function as the value of the "onUnhandledRequest" option.',
            strategy,
          ),
        )
    }
  }

  if (typeof strategy === 'function') {
    strategy(request, {
      warning: applyStrategy.bind(null, 'warn'),
      error: applyStrategy.bind(null, 'error'),
    })
    return
  }

  /**
   * @note Ignore "file://" requests.
   * Those often are an implementation detail of modern tooling
   * that fetches modules via HTTP. Developers don't issue those
   * requests and so they mustn't be warned about them.
   */
  if (url.protocol === 'file:') {
    return
  }

  applyStrategy(strategy)
}
