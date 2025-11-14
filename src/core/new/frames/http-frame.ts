import { createRequestId } from '@mswjs/interceptors'
import { BaseNetworkFrame } from './base-frame'
import { toPublicUrl } from '../../utils/request/toPublicUrl'

type HttpNetworkFrameEventMap = {
  'request:start': [
    args: {
      request: Request
      requestId: string
    },
  ]
  'request:match': [
    args: {
      request: Request
      requestId: string
    },
  ]
  'request:unhandled': [
    args: {
      request: Request
      requestId: string
    },
  ]
  'request:end': [
    args: {
      request: Request
      requestId: string
    },
  ]
  'response:mocked': [
    args: {
      request: Request
      requestId: string
      response: Response
    },
  ]
  'response:bypass': [
    args: {
      request: Request
      requestId: string
      response: Response
    },
  ]
  unhandledException: [
    args: {
      error: Error
      request: Request
      requestId: string
    },
  ]
}

export abstract class HttpNetworkFrame extends BaseNetworkFrame<
  'http',
  {
    id?: string
    request: Request
  },
  HttpNetworkFrameEventMap
> {
  public id: string

  constructor(args: { id?: string; request: Request }) {
    super('http', { request: args.request })
    this.id = args.id || createRequestId()
  }

  public abstract respondWith(response?: Response): void
  public abstract errorWith(reason?: unknown): void
  public abstract passthrough(): void

  public async getUnhandledFrameMessage(): Promise<string> {
    const { request } = this.data

    const url = new URL(request.url)
    const publicUrl = toPublicUrl(url) + url.search
    const requestBody =
      request.body == null ? null : await request.clone().text()

    const details = `\n\n  \u2022 ${request.method} ${publicUrl}\n\n${requestBody ? `  \u2022 Request body: ${requestBody}\n\n` : ''}`
    const message = `intercepted a request without a matching request handler:${details}If you still wish to intercept this unhandled request, please create a request handler for it.\nRead more: https://mswjs.io/docs/http/intercepting-requests`

    return message
  }
}
