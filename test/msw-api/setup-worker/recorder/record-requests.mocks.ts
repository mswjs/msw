import { setupWorker, rest } from 'msw'

const worker = setupWorker()

worker.start()
worker.use()
// @ts-ignore
window.__MSW__ = worker
// @ts-ignore
window.rest = rest
