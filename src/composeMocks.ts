import * as R from 'ramda'
import {
  SchemaEntryGetter,
  SchemaEntry,
  SchemaEntryBody,
} from './handlers/createHandler'
import interceptRequest from './utils/interceptRequest'

export type Mask = RegExp | string
export type MockingSchema = SchemaEntry<SchemaEntryBody[]>

interface PublicAPI {
  schema: MockingSchema
  start(serviceWorkerURL: string, options?: RegistrationOptions): void
  stop(): void
}

/**
 * Starts MockServiceWorker.
 */
const start = (
  worker: ServiceWorker,
  workerRegistration: ServiceWorkerRegistration,
) => (
  swUrl: string = './mockServiceWorker.js',
  options?: RegistrationOptions,
) => {
  if (workerRegistration) {
    return workerRegistration.update()
  }

  window.addEventListener('beforeunload', () => {
    // Deactivate requests interception before page unload.
    // Initial page load requests client resources such as HTML, CSS, JS,
    // which will go through the MSW in favor to be intercepted.
    // Such interception must never happen to ensure proper page load.
    //
    // When the client-side JavaScript initializes, it will call to "msw.start()"
    // which will signal active ServiceWorker to resume requests interception.
    if (worker && worker.state !== 'redundant') {
      this.isRunning = false
      worker.postMessage('MOCK_DEACTIVATE')
    }
  })

  return navigator.serviceWorker
    .register(swUrl, options)
    .then((reg) => {
      const workerInstance = reg.active || reg.installing || reg.waiting

      workerInstance.postMessage('MOCK_ACTIVATE')
      worker = workerInstance
      workerRegistration = reg

      // Await for the worker to be come activated.
      // Otherwise attempts to communicate with it may be malfunctioning.
      // This also helps automated tests to know when the worker is ready.
      return new Promise((resolve) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            resolve(worker.state)
          }
        })
      })
    })
    .catch((error) => {
      console.error(
        '[MSW] Failed to register MockServiceWorker (%s).\n%o',
        swUrl,
        error,
      )
    })
}

/**
 * Stops active running instance of MockServiceWorker.
 */
const stop = (
  worker: ServiceWorker,
  workerRegistration: ServiceWorkerRegistration,
) => () => {
  if (!workerRegistration) {
    return console.warn(
      '[MSW] No active instance of MockServiceWorker is running.',
    )
  }

  return workerRegistration
    .unregister()
    .then(() => {
      worker = null
      workerRegistration = null
    })
    .catch((error) => {
      console.error('[MSW] Failed to unregister MockServiceWorker.\n%o', error)
    })
}

export default function composeMocks(
  ...handlers: SchemaEntryGetter[]
): PublicAPI {
  let worker: ServiceWorker
  let workerRegistration: ServiceWorkerRegistration

  const schema = handlers.reduce<MockingSchema>(
    (schema, getSchemaEntry) => {
      const [method, entry] = getSchemaEntry()
      const prevEntries = R.path<SchemaEntryBody[]>([method], schema) || []
      const nextEntries = prevEntries.concat(entry)

      return R.assoc(method, nextEntries, schema)
    },
    {} as MockingSchema,
  )

  navigator.serviceWorker.addEventListener('message', interceptRequest(schema))

  return {
    start: start(worker, workerRegistration),
    stop: stop(worker, workerRegistration),
    schema,
  }
}
