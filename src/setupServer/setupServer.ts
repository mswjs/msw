import http from 'http'
import { RequestHandler } from '../handlers/requestHandler'
import { HttpClientRequestOverride } from './utils/HttpClientRequestOverride'

export const setupServer = (...handlers: RequestHandler<any, any>[]) => {
  return {
    open() {
      http.request = (...args: any[]): any => {
        return new HttpClientRequestOverride(args[0], handlers)
      }
    },
    /**
     * @todo
     */
    close() {},
  }
}
