import { getWorkerByRegistration } from './getWorkerByRegistration'
import { until } from '@open-draft/until'
import { ServiceWorkerInstanceTuple } from '../../glossary'

/**
 * Returns an active Service Worker instance.
 * When not found, registers a new Service Worker.
 */
export const getWorkerInstance = async (
  url: string,
  options?: RegistrationOptions,
): Promise<ServiceWorkerInstanceTuple | null> => {
  const [, existingRegistration] = await until(() => {
    return navigator.serviceWorker.getRegistration(url)
  })

  if (existingRegistration) {
    // Update existing service worker to ensure it's up-to-date
    return existingRegistration.update().then(() => {
      return [
        getWorkerByRegistration(existingRegistration),
        existingRegistration,
      ]
    })
  }

  const [error, instance] = await until<ServiceWorkerInstanceTuple>(
    async () => {
      const registration = await navigator.serviceWorker.register(url, options)
      return [getWorkerByRegistration(registration), registration]
    },
  )

  if (error) {
    console.error(
      '[MSW] Failed to register Service Worker (%s). %o',
      url,
      error,
    )
    return null
  }

  return instance
}
