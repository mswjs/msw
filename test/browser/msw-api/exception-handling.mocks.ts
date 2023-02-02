import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com/users/:username', () => {
    // @ts-ignore
    nonExisting()
    return null
  }),
)

worker.start()
