/**
 * @jest-environment node
 */
import { ChildProcess, spawn } from 'child_process'
import { invariant } from 'outvariant'
import { HttpResponse, rest } from 'msw'
import { setupRemoteServer } from 'msw/node'
import { DeferredPromise } from '@open-draft/deferred-promise'

const remote = setupRemoteServer()

class TestNodeApp {
  private io: ChildProcess = null as any
  private _url: URL | null = null

  constructor(private readonly appSourcePath: string) {}

  get url() {
    invariant(
      this._url,
      'Failed to return the URL for the test Node app: the app is not running. Did you forget to call ".spawn()"?',
    )

    return this._url.href
  }

  public async spawn() {
    const spawnPromise = new DeferredPromise<URL>()

    this.io = spawn('node', [this.appSourcePath], {
      // Establish an IPC between the test and the test app.
      // This IPC is not required for the remote interception to work.
      // This IPC is required for the test app to be spawned at a random port
      // and be able to communicate the port back to the test.
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    })

    this.io
      .on('message', (message) => {
        try {
          const url = new URL(message.toString())
          spawnPromise.resolve(url)
        } catch (error) {
          return
        }
      })
      .on('error', (error) => spawnPromise.reject(error))
      .on('exit', (code) => {
        if (code !== 0) {
          spawnPromise.reject(
            new Error(`Failed to spawn a test Node app (exit code: ${code})`),
          )
        }
      })

    spawnPromise.then((url) => {
      this._url = url
    })

    return Promise.race([
      spawnPromise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Failed to spawn a test Node app within timeout'))
        }, 5_000)
      }),
    ])
  }

  public async close() {
    const closePromise = new DeferredPromise<void>()

    this.io.send('SIGTERM', (error) => {
      if (error) {
        closePromise.reject(error)
      } else {
        closePromise.resolve()
      }
    })

    return closePromise
  }
}

const testApp = new TestNodeApp(require.resolve('./use.app.js'))

beforeAll(async () => {
  await remote.listen()
  await testApp.spawn()
})

afterEach(() => {
  remote.resetHandlers()
})

afterAll(async () => {
  await remote.close()
  await testApp.close()
})

it('returns a mocked response defined in the app by default', async () => {
  const response = await fetch(new URL('/resource', testApp.url))
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')

  const json = await response.json()
  expect(json).toEqual([1, 2, 3])
})

it('returns a mocked response from the matching runtime request handler', async () => {
  remote.use(
    rest.get('https://example.com/resource', () => {
      return HttpResponse.json({ mocked: true })
    }),
  )

  const response = await fetch(new URL('/resource', testApp.url))
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')

  const json = await response.json()
  expect(json).toEqual({ mocked: true })
})
