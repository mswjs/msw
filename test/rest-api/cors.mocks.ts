import { setupWorker } from 'msw'

const worker = setupWorker()

worker.start()

worker.on('response:mocked', (res) => {
  console.log('[mocked]', res)
})
worker.on('response:bypass', (res) => {
  console.log('[bypassed]', res)
})
