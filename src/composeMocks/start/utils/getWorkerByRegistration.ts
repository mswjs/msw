/**
 * Attempts to resolve a Service Worker instance from any of its states:
 * active, installing, or waiting.
 */
export const getWorkerByRegistration = (
  registration: ServiceWorkerRegistration,
): ServiceWorker | null => {
  return registration.active || registration.installing || registration.waiting
}
