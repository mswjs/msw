import { addMessageListener } from './createBroadcastChannel'

export const requestIntegrityCheck = (
  serviceWorker: ServiceWorker,
): Promise<ServiceWorker> => {
  return new Promise((resolve, reject) => {
    addMessageListener('INTEGRITY_CHECK_RESPONSE', (message) => {
      const { payload: actualChecksum } = message

      // Compare the response from the Service Worker and the
      // global variable set by webpack upon build.
      if (actualChecksum !== SERVICE_WORKER_CHECKSUM) {
        return reject(
          new Error(
            `Currently active Service Worker (${actualChecksum}) is behind the latest published one (${SERVICE_WORKER_CHECKSUM}).`,
          ),
        )
      }

      resolve(serviceWorker)
    })

    navigator.serviceWorker.addEventListener('messageerror', reject)

    // Signal Service Worker to report back its integrity
    serviceWorker.postMessage('INTEGRITY_CHECK_REQUEST')
  })
}
