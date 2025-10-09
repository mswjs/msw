import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { InterceptorSource } from '~/core/new/sources/interceptor-source'
import { devUtils } from '~/core/utils/internal/devUtils'

export class FallbackSource extends InterceptorSource {
  constructor() {
    super({
      interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
    })
  }

  public async enable(): Promise<void> {
    await super.enable()
    this.#printStartMessage()
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
}
