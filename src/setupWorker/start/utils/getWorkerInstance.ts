import { until } from '@open-draft/until'
import { getWorkerByRegistration } from './getWorkerByRegistration'
import {
  ServiceWorkerInstanceTuple,
  ServiceWorkerMatcher,
} from '../../glossary'
import { getAbsoluteWorkerUrl } from '../../../utils/url/getAbsoluteWorkerUrl'

/**
 * Returns an active Service Worker instance.
 * When not found, registers a new Service Worker.
 */
export const getWorkerInstance = async (
  serviceWorkerMatcher: ServiceWorkerMatcher,
  url: string,
  options?: RegistrationOptions,
): Promise<ServiceWorkerInstanceTuple | null> => {
  // Resolve the absolute Service Worker URL
  const absoluteWorkerUrl = getAbsoluteWorkerUrl(url)

  const [, mockRegistrations] = await until(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    return registrations.filter((registration) => {
      return getWorkerByRegistration(
        registration,
        absoluteWorkerUrl,
        serviceWorkerMatcher,
      )
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

  const [existingRegistration] = mockRegistrations

  if (existingRegistration) {
    // Update existing service worker to ensure it's up-to-date
    return existingRegistration.update().then(() => {
      return [
        getWorkerByRegistration(
          existingRegistration,
          absoluteWorkerUrl,
          serviceWorkerMatcher,
        ),
        existingRegistration,
      ]
    })
  }

  const [error, instance] = await until<ServiceWorkerInstanceTuple>(
    async () => {
      const registration = await navigator.serviceWorker.register(url, options)
      return [
        // Compare existing worker registration by its worker URL,
        // to prevent irrelevant workers to resolve here (such as Codesandbox worker).
        getWorkerByRegistration(
          registration,
          absoluteWorkerUrl,
          serviceWorkerMatcher,
        ),
        registration,
      ]
    },
  )

  if (error) {
    const isWorkerMissing = error.message.includes('(404)')

    // Produce a custom error message when given a non-existing Service Worker url.
    // Suggest developers to check their setup.
    if (isWorkerMissing) {
      const scopeUrl = new URL(options?.scope || '/', location.href)

      console.error(`\
[MSW] Failed to register a Service Worker for scope ('${scopeUrl.href}') with script ('${absoluteWorkerUrl}'): Service Worker script does not exist at the given path.

Did you forget to run "npx msw init <PUBLIC_DIR>"?

Learn more about creating the Service Worker script: https://mswjs.io/docs/cli/init`)

      return null
    }

    // Fallback error message for any other registration errors.
    console.error(
      `[MSW] Failed to register a Service Worker:\n\m${error.message}`,
    )
    return null
  }

  return instance
}
