import { addMessageListener } from '../../../utils/createBroadcastChannel'
import { StartOptions } from '../../glossary'
import { MSWEventListener } from '../../../utils/internal/mswEventListener'

export const activateMocking = (
  worker: ServiceWorker,
  options?: StartOptions,
) => {
  let listeners: MSWEventListener[]
  const removeLiteners = () => {
    listeners.forEach((listener) =>
      listener.handler.removeEventListener(listener.type, listener.listener),
    )
  }

  worker.postMessage('MOCK_ACTIVATE')

  return new Promise((resolve, reject) => {
    // Wait until the mocking is enabled to resolve the start Promise
    listeners = addMessageListener(
      'MOCKING_ENABLED',
      () => {
        if (!options?.quiet) {
          console.groupCollapsed(
            '%c[MSW] Mocking enabled.',
            'color:orangered;font-weight:bold;',
          )
          console.log(
            '%cDocumentation: %chttps://mswjs.io/docs',
            'font-weight:bold',
            'font-weight:normal',
          )
          console.log('Found an issue? https://github.com/mswjs/msw/issues')
          console.groupEnd()
        }
        removeLiteners()
        return resolve()
      },
      () => {
        removeLiteners()
        reject()
      },
    )
  })
}
