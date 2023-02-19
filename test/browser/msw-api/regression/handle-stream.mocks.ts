import { setupWorker } from 'msw'

const worker = setupWorker()

worker.events.on('response:bypass', async (res) => {
  const textResponse = await res.text()
  console.warn(`[response:bypass] ${textResponse}`)
})

worker.start({ onUnhandledRequest: 'bypass' })
