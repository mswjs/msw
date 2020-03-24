const integrity = require('../integrity.json')

export const requestIntegrityCheck = (
  serviceWorker: ServiceWorker,
): Promise<ServiceWorker> => {
  return new Promise((resolve, reject) => {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload: actualIntegrity } = JSON.parse(event.data)

      if (type === 'INTEGRITY_CHECK_RESPONSE') {
        if (integrity.serviceWorkerIntegrity !== actualIntegrity) {
          return reject(new Error('Integrity assertion failed'))
        }

        resolve(serviceWorker)
      }
    })

    navigator.serviceWorker.addEventListener('messageerror', reject)

    // Signal Service Worker to report back its integrity
    serviceWorker.postMessage('INTEGRITY_CHECK_REQUEST')
  })
}
