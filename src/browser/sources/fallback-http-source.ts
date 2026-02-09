import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { InterceptorSource } from '#core/future/sources/interceptor-source'
import { devUtils } from '#core/utils/internal/devUtils'

interface FallbackHttpSourceOptions {
  quiet?: boolean
}

export class FallbackHttpSource extends InterceptorSource {
  constructor(private readonly options: FallbackHttpSourceOptions) {
    super({
      interceptors: [new XMLHttpRequestInterceptor(), new FetchInterceptor()],
    })
  }

  public async enable(): Promise<void> {
    await super.enable()

    if (!this.options.quiet) {
      this.#printStartMessage()
    }
  }

  public async disable(): Promise<void> {
    await super.disable()

    if (!this.options.quiet) {
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
