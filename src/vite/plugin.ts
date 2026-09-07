import fs from 'node:fs'
import type { Plugin } from 'vite'

const DEFAULT_WORKER_URL = '/mockServiceWorker.js'
const WORKER_SCRIPT_PATH = new URL('../mockServiceWorker.js', import.meta.url)

export interface MswPluginOptions {
  /**
   * URL to serve the worker script at.
   * @default "/mockServiceWorker.js"
   */
  workerUrl?: string
}

/**
 * A Vite plugin for Mock Service Worker.
 * Serves the worker script from the installed MSW version
 * for development and testing purposes.
 *
 * @example
 * import { msw } from 'msw/vite'
 *
 * export default defineConfig({
 *   plugins: [msw()]
 * })
 */
export function msw(options: MswPluginOptions = {}): Plugin {
  const workerUrl = options.workerUrl ?? DEFAULT_WORKER_URL
  const workerScript = fs.readFileSync(WORKER_SCRIPT_PATH, 'utf8')

  return {
    name: 'msw',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://localhost')

        if (requestUrl.pathname !== workerUrl) {
          next()
          return
        }

        response.writeHead(200, {
          'cache-control': 'no-cache',
          'content-type': 'application/javascript; charset=utf-8',
          'service-worker-allowed': '/',
        })
        response.end(workerScript)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://localhost')

        if (requestUrl.pathname !== workerUrl) {
          next()
          return
        }

        response.writeHead(200, {
          'cache-control': 'no-cache',
          'content-type': 'application/javascript; charset=utf-8',
          'service-worker-allowed': '/',
        })
        response.end(workerScript)
      })
    },
  }
}
