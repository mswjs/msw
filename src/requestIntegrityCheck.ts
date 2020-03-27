export const requestIntegrityCheck = (
  serviceWorker: ServiceWorker,
): Promise<ServiceWorker> => {
  return new Promise((resolve, reject) => {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload: actualChecksum } = JSON.parse(event.data)

      if (type === 'INTEGRITY_CHECK_RESPONSE') {
        // Compare the response from the Service Worker and the
        // global variable set by webpack upon build.
        if (SERVICE_WORKER_CHECKSUM !== actualChecksum) {
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
