import { http, delay, DelayMode, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/delay', async ({ request }) => {
    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') as DelayMode
    const duration = url.searchParams.get('duration')

    await delay(duration ? Number(duration) : mode || undefined)

    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
