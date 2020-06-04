import { addMessageListener } from '../../../utils/createBroadcastChannel'
import { StartOptions } from '../../glossary'

export const activateMocking = (
  worker: ServiceWorker,
  options?: StartOptions,
) => {
  worker.postMessage('MOCK_ACTIVATE')

  return new Promise((resolve, reject) => {
    // Wait until the mocking is enabled to resolve the start Promise
    addMessageListener(
      'MOCKING_ENABLED',
      () => {
        if (!options?.quiet) {
          console.groupCollapsed(
            '%c[MSW] Mocking enabled.',
            'color:orangered;font-weight:bold;',
          )
          console.log(
            '%cDocumentation: %chttps://redd.gitbook.io/msw',
            'font-weight:bold',
            'font-weight:normal',
          )
          console.log('Found an issue? https://github.com/mswjs/msw/issues')
          console.groupEnd()
        }

        return resolve()
      },
      reject,
    )
  })
}
