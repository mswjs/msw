import { spawn } from 'node:child_process'
import { DeferredPromise } from '@open-draft/deferred-promise'

it('does not leak memory when handling a large number of requests', async () => {
  // Spawn the memory consumption scenario in a child process
  // so the test runner's memory consumption does not affect the results.
  const child = spawn(
    'node',
    [
      new URL('./memory-consumption.js', import.meta.url).pathname,
      '--expose-gc',
    ],
    {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    },
  )

  const memoryUsedPromise = new DeferredPromise<number>()
  child.on('message', (message) => {
    if (typeof message === 'number') {
      memoryUsedPromise.resolve(message)
    }
  })
  const memoryUsed = await memoryUsedPromise

  console.log({ memoryUsed })
})
