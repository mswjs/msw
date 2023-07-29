import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('https://api.github.com/users/:username', () => {
    // @ts-ignore
    nonExisting()
    return
  }),
)

worker.start()
