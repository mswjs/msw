import { setupWorker, rest } from 'msw'

function sleep(timeMs: number) {
  return new Promise((resolve) => setTimeout(resolve, timeMs))
}

const worker = setupWorker(
  rest.get('/video', (req, res, ctx) => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('hello'))
        await sleep(500)
        controller.enqueue(encoder.encode('world'))
        await sleep(500)
        controller.close()
      },
    })

    return res(ctx.set('Content-Type', 'text/plain'), ctx.stream(stream))
  }),
)

worker.start()

document.body.addEventListener('click', () => {
  fetch('/video').then(async (res) => {
    const decoder = new TextDecoder()
    const reader = res.body.getReader()

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      console.log(`stream chunk: ${decoder.decode(value)}`)
    }

    return
  })
})
