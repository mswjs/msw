import { invariant } from 'outvariant'
import { ChildProcess, spawn } from 'child_process'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { remoteContext } from 'msw/node'

export async function spawnTestApp(appSourcePath: string) {
  let url: string | undefined
  const spawnPromise = new DeferredPromise<string>().then((resolvedUrl) => {
    url = resolvedUrl
  })

  const io = spawn('node', [appSourcePath], {
    // Establish an IPC between the test and the test app.
    // This IPC is not required for the remote interception to work.
    // This IPC is required for the test app to be spawned at a random port
    // and be able to communicate the port back to the test.
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: {
      ...process.env,
      [remoteContext.variableName]: remoteContext.getContextId(),
    },
  })

  io.stdout?.on('data', (data) => console.log(data.toString()))
  io.stderr?.on('data', (data) => console.error(data.toString()))

  io.on('message', (message) => {
    try {
      const url = new URL(message.toString())
      spawnPromise.resolve(url.href)
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

  await Promise.race([
    spawnPromise,
    new Promise<undefined>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Failed to spawn a test Node app within timeout'))
      }, 5000)
    }),
  ])

  return {
    get url() {
      invariant(
        url,
        'Failed to return the URL for the test Node app: the app is not running. Did you forget to call ".spawn()"?',
      )

      return url
    },

    async [Symbol.asyncDispose]() {
      if (io.exitCode !== null) {
        return Promise.resolve()
      }

      const closePromise = new DeferredPromise<void>()

      io.send('SIGTERM', (error) => {
        if (error) {
          closePromise.reject(error)
        } else {
          closePromise.resolve()
        }
      })

      await closePromise
    },
  }
}

//
//
//

export class TestNodeApp {
  private io: ChildProcess = null as any
  private _url: URL | null = null

  constructor(
    private readonly appSourcePath: string,
    private readonly options?: { contextId: string },
  ) {}

  get url() {
    invariant(
      this._url,
      'Failed to return the URL for the test Node app: the app is not running. Did you forget to call ".spawn()"?',
    )

    return this._url
  }

  public async start(): Promise<URL | undefined> {
    const spawnPromise = new DeferredPromise<URL>()

    this.io = spawn('node', [this.appSourcePath], {
      // Establish an IPC between the test and the test app.
      // This IPC is not required for the remote interception to work.
      // This IPC is required for the test app to be spawned at a random port
      // and be able to communicate the port back to the test.
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: {
        ...process.env,
        MSW_REMOTE_CONTEXT_ID: this.options?.contextId,
      },
    })

    this.io.stdout?.on('data', (c) => console.log(c.toString()))
    this.io.stderr?.on('data', (c) => console.error(c.toString()))

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
      new Promise<undefined>((_, reject) => {
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
