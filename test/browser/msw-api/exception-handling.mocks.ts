import { rest } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('https://api.github.com/users/:username', () => {
    // @ts-ignore
    nonExisting()
    return
  }),
)

worker.start()
