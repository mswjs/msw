import { setupWorker } from 'msw/browser'

const worker = setupWorker()

worker.events.on('response:bypass', async (res) => {
  const responseText = await res.text()
  console.warn(`[response:bypass] ${responseText}`)
})

worker.start({ onUnhandledRequest: 'bypass' })
