/**
 * Attempts to resolve a Service Worker instance from any of its states:
 * active, installing, or waiting.
 */
export const getWorkerByRegistration = (
  registration: ServiceWorkerRegistration,
): ServiceWorker | null => {
  console.log('getWorkerByRegistration registration', registration)
  return registration.active || registration.installing || registration.waiting
}
