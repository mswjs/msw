import { setupWorker } from 'msw/browser'

// @ts-expect-error
window.worker = setupWorker()
