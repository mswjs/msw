import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    return HttpResponse.html(`
<p class="user" id="abc-123">
  Jane Doe
</p>`)
  }),
)

worker.start()
