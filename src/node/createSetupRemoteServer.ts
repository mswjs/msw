import { createRemoteInterceptor, Interceptor } from '@mswjs/interceptors'
import { SetupRemoteServerApi } from './glossary'

export function createSetupRemoteServer(...interceptors: Interceptor[]) {
  return function setupRemoteServer(): SetupRemoteServerApi {
    const interceptor = createRemoteInterceptor({
      modules: interceptors,
    })

    return {
      listen() {
        interceptor.apply()
      },
      close() {
        interceptor.restore()
      },
    }
  }
}
