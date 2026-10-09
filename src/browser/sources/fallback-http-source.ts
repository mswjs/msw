import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { InterceptorSource } from '#core/experimental/sources/interceptor-source'
import type { NetworkFrameResolutionContext } from '#core/experimental/frames/network-frame'
import { devUtils } from '#core/utils/internal/dev-utils'

export class FallbackHttpSource extends InterceptorSource {
  /**
   * The resolved context of the network this source was last enabled with.
   */
  #context?: NetworkFrameResolutionContext

  constructor() {
    super({
      interceptors: [new XMLHttpRequestInterceptor(), new FetchInterceptor()],
    })
  }

  public enable(context?: NetworkFrameResolutionContext): void {
    this.#context = context
    super.enable()

    if (!this.#context?.quiet) {
      this.#printStartMessage()
    }
  }

  public disable(): void {
    super.disable()

    if (!this.#context?.quiet) {
      this.#printStopMessage()
    }
  }

  #printStartMessage(): void {
    console.groupCollapsed(
      `%c${devUtils.formatMessage('Mocking enabled (fallback mode).')}`,
      'color:orangered;font-weight:bold;',
    )
    // eslint-disable-next-line no-console
    console.log(
      '%cDocumentation: %chttps://mswjs.io/docs',
      'font-weight:bold',
      'font-weight:normal',
    )
    // eslint-disable-next-line no-console
    console.log('Found an issue? https://github.com/mswjs/msw/issues')
    console.groupEnd()
  }

  #printStopMessage(): void {
    // eslint-disable-next-line no-console
    console.log(
      `%c${devUtils.formatMessage('Mocking disabled.')}`,
      'color:orangered;font-weight:bold;',
    )
  }
}
