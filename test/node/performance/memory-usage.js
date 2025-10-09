import http from 'node:http'
import { setupServer } from 'msw/node'

async function profile() {
  const startMemoryUsage = process.memoryUsage().heapUsed

  for (let i = 0; i < 10_000; i++) {
    let server

    if (!process.env.USE_NODE) {
      server = setupServer()
      server.listen({ onUnhandledRequest: 'bypass' })
    }

    await new Promise((resolve) => {
      http
        .get('http://localhost/non-existent', () => resolve())
        .on('error', () => resolve())
    })

    if (!process.env.USE_NODE) {
      server.close()
    }
  }

  const endMemoryUsage = process.memoryUsage().heapUsed
  const memoryUsed = (endMemoryUsage - startMemoryUsage) / 1024 / 1024

  console.log(
    'Memory used:',
    memoryUsed,
    'MB',
    process.env.USE_NODE ? '(Node.js)' : '(MSW)',
  )

  global.gc?.()
  process.send?.(memoryUsed)
}

profile()
