import { FindWorker } from '../../glossary'

/**
 * Attempts to resolve a Service Worker instance from a given registration,
 * regardless of its state (active, installing, waiting).
 */
export function getWorkerByRegistration(
  registration: ServiceWorkerRegistration | null,
  absoluteWorkerUrl: string,
  findWorker: FindWorker,
): ServiceWorker | null {
  /**
   * @note Worker registration may be null if the registration was cancelled
   * by "worker.stop()" before resolving.
   */
  if (registration == null) {
    return null
  }

  const allStates = [
    registration.active,
    registration.installing,
    registration.waiting,
  ]
  const relevantStates = allStates.filter((state): state is ServiceWorker => {
    return state != null
  })
  const worker = relevantStates.find((worker) => {
    return findWorker(worker.scriptURL, absoluteWorkerUrl)
  })

  return worker || null
}
