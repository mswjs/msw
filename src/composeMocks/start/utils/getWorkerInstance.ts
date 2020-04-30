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
  // Resolve the absolute Service Worker URL
  const absoluteWorkerUrl = (location.origin + url).replace(
    /(?<!:)(\/*\.\/|\/{2,})/g,
    '/',
  )

  const [, mockRegistrations] = await until(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    return registrations.filter((registration) => {
      const worker = getWorkerByRegistration(registration)
      // Filter out other workers that can be associated with this page
      return worker?.scriptURL === absoluteWorkerUrl
    })
  })

  if (!navigator.serviceWorker.controller && mockRegistrations.length > 0) {
    // Reload the page when it has associated workers, but no active controller.
    // The absence of a controller can mean either:
    // - page has no Service Worker associated with it
    // - page has been hard-reloaded and its workers won't be used until the next reload.
    // Since we've checked that there are registrations associated with this page,
    // at this point we are sure it's hard reload that falls into this clause.
    location.reload()
  }

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
