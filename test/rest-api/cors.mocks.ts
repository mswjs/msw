import { setupWorker, rest } from 'msw'

const worker = setupWorker()

worker.start()
