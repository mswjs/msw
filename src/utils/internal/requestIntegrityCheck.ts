import { SetupWorkerInternalContext } from '../../setupWorker/glossary'

export async function requestIntegrityCheck(
  context: SetupWorkerInternalContext,
  serviceWorker: ServiceWorker,
): Promise<ServiceWorker> {
  // Signal Service Worker to report back its integrity
  serviceWorker.postMessage('INTEGRITY_CHECK_REQUEST')

  const { payload: actualChecksum } = await context.once(
    'INTEGRITY_CHECK_RESPONSE',
  )

  // Compare the response from the Service Worker and the
  // global variable set by webpack upon build.
  if (actualChecksum !== SERVICE_WORKER_CHECKSUM) {
    throw new Error(
      `Currently active Service Worker (${actualChecksum}) is behind the latest published one (${SERVICE_WORKER_CHECKSUM}).`,
    )
  }
  return serviceWorker
}
