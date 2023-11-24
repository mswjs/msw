import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('https://api.github.com/users/:username', () => {
    // @ts-expect-error nonExisting should not be defined
    nonExisting()
    return
  }),
)

worker.start()
