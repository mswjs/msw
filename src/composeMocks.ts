import * as R from 'ramda'
import {
  SchemaEntryGetter,
  SchemaEntry,
  SchemaEntryBody,
} from './handlers/createHandler'
import interceptRequest from './utils/interceptRequest'

export type Mask = RegExp | string
export type MockingSchema = SchemaEntry<SchemaEntryBody[]>

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
    /**
     * Deactivate requests interception before page unload.
     * Initial page load requests client resources such as HTML, CSS, JS,
     * which will go through the MSW in favor to be intercepted.
     * Such interception must never happen to ensure proper page load.
     *
     * When the client-side JavaScript initializes, it will call to "msw.start()"
     * which will signal active ServiceWorker to resume requests interception.
     */
    if (worker && worker.state !== 'redundant') {
      worker.postMessage('MOCK_DEACTIVATE')
    }
  })

  navigator.serviceWorker
    .register(swUrl, options)
    .then((reg) => {
      const workerInstance = reg.active || reg.installing || reg.waiting

      workerInstance.postMessage('MOCK_ACTIVATE')
      worker = workerInstance
      workerRegistration = reg

      return reg
    })
    .catch((error) => {
      console.error(
        '[MSW] Failed to register MockServiceWorker (%s). %o',
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

  workerRegistration
    .unregister()
    .then(() => {
      worker = null
      workerRegistration = null
    })
    .catch((error) => {
      console.error('[MSW] Failed to unregister MockServiceWorker. %o', error)
    })
}

export default function composeMocks(...handlers: SchemaEntryGetter[]): any {
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
