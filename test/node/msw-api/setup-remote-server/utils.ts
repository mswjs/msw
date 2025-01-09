import { invariant } from 'outvariant'
import { spawn } from 'child_process'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { type ListenOptions, getRemoteEnvironment } from 'msw/node'

export async function spawnTestApp(
  appSourcePath: string,
  listenOptions: Partial<ListenOptions> = {},
) {
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
      ...getRemoteEnvironment(),
      SETUP_SERVER_LISTEN_OPTIONS: JSON.stringify(listenOptions),
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
