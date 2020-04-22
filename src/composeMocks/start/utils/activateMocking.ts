import { addMessageListener } from '../../../utils/createBroadcastChannel'

export const activateMocking = (worker: ServiceWorker) => {
  worker.postMessage('MOCK_ACTIVATE')

  return new Promise((resolve, reject) => {
    // Wait until the mocking is enabled to resolve the start Promise
    addMessageListener(
      'MOCKING_ENABLED',
      () => {
        console.groupCollapsed(
          '%c[MSW] Mocking enabled.',
          'color:orangered;font-weight:bold;',
        )
        console.log(
          '%cDocumentation: %chttps://redd.gitbook.io/msw',
          'font-weight:bold',
          'font-weight:normal',
        )
        console.log('Found an issue? https://github.com/open-draft/msw/issues')
        console.groupEnd()

        return resolve()
      },
      reject,
    )
  })
}
