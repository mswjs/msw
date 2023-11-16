import { setupWorker } from 'msw/browser'

// @ts-ignore
window.worker = setupWorker()
