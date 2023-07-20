import { setupWorker } from 'msw/browser'

const worker = setupWorker()

worker.events.on('response:bypass', async ({ response }) => {
  const responseText = await response.clone().text()
  console.warn(`[response:bypass] ${responseText}`)
})

worker.start({ onUnhandledRequest: 'bypass' })
