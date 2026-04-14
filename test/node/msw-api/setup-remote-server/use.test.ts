// @vitest-environment node
import { Worker } from 'node:worker_threads'
import { http, HttpResponse } from 'msw'
import { defineNetwork } from 'msw/experimental'
import { RemoteNetworkSource } from 'msw/remote'

const network = defineNetwork({
  sources: [new RemoteNetworkSource()],
})

beforeAll(async () => {
  await network.enable()
})

afterEach(() => {
  network.resetHandlers()
})

afterAll(async () => {
  await network.disable()
})

function createDisposableWorker(
  ...args: ConstructorParameters<typeof Worker>
): AsyncDisposable & { worker: Worker } {
  const worker = new Worker(...args)

  worker.stdout.pipe(process.stdout)
  worker.stderr.pipe(process.stderr)

  return {
    async [Symbol.asyncDispose]() {
      await worker.terminate()
    },
    worker,
  }
}

it('mocks a response to a request performed in another process', async () => {
  network.use(
    http.get('https://api.acme.com/user', () => {
      return HttpResponse.json({ id: 1, name: 'John Maverick' })
    }),
  )

  await using disposable = createDisposableWorker(
    new URL('./app.js', import.meta.url),
  )
  const { worker } = disposable

  const pendingMessage = Promise.withResolvers<string>()
  worker.on('message', (message) => pendingMessage.resolve(message))

  await expect(pendingMessage.promise).resolves.toBe(200)
})
