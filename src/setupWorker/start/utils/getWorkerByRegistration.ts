/**
 * Attempts to resolve a Service Worker instance from any of its states:
 * active, installing, or waiting.
 */
export const getWorkerByRegistration = (
  registration: ServiceWorkerRegistration,
): ServiceWorker | null => {
  console.log(
    'getWorkerByRegistration registration',
    registration,
    registration.active,
    registration.installing,
    registration.waiting,
  )
  return registration.active || registration.installing || registration.waiting
}
