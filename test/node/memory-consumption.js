import http from 'node:http'
import { setupServer } from 'msw/node'

async function profile() {
  const startMemoryUsage = process.memoryUsage().heapUsed

  for (let i = 0; i < 1000; i++) {
    const server = setupServer()
    server.listen({ onUnhandledRequest: 'bypass' })

    await new Promise((resolve) => {
      http
        .get('http://localhost/non-existent', () => resolve())
        .on('error', () => resolve())
    })

    server.close()
  }

  const endMemoryUsage = process.memoryUsage().heapUsed
  const memoryUsed = endMemoryUsage - startMemoryUsage

  global.gc?.()
  process.send?.(memoryUsed)
}

profile()
