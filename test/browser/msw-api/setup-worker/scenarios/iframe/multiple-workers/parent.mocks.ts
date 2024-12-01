import { setupWorker } from 'msw/browser'

// The parent frame has a worker without any handlers.
const worker = setupWorker()

// This registration is awaited by the `loadExample` command in the test.
worker.start()
