/**
 * Attempts to resolve a Service Worker instance from any of its states:
 * active, installing, or waiting.
 */
export const getWorkerByRegistration = (
  registration: ServiceWorkerRegistration,
  absoluteWorkerUrl: string,
): ServiceWorker | null => {
  return (
    [registration.active, registration.installing, registration.waiting].find(
      (worker) => worker?.scriptURL === absoluteWorkerUrl,
    ) || null
  )
}
