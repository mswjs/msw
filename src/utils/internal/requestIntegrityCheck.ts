import { addMessageListener } from '../createBroadcastChannel'
import { MSWEventListener } from './mswEventListener'

export function requestIntegrityCheck(
  serviceWorker: ServiceWorker,
): Promise<ServiceWorker> {
  let listeners: MSWEventListener[]
  // Signal Service Worker to report back its integrity
  serviceWorker.postMessage('INTEGRITY_CHECK_REQUEST')
  const removeLiteners = () => {
    listeners.forEach((listener) =>
      listener.handler.removeEventListener(listener.type, listener.listener),
    )
  }
  return new Promise((resolve, reject) => {
    listeners = addMessageListener(
      'INTEGRITY_CHECK_RESPONSE',
      (message) => {
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
        removeLiteners()
        resolve(serviceWorker)
      },
      () => {
        removeLiteners()
        reject()
      },
    )
  })
}
