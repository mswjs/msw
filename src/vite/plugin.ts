import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { stripNetwork } from './strip-network'

const DEFAULT_WORKER_URL = '/mockServiceWorker.js'
const WORKER_SCRIPT_PATH = new URL('../mockServiceWorker.js', import.meta.url)
const VIRTUAL_MODULE_ID = 'virtual:msw'
const VIRTUAL_OPTIONS_ID = 'virtual:msw/options'
const RUNTIME_PATH = fileURLToPath(new URL('./runtime.js', import.meta.url))
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

export interface MswPluginOptions {
  /**
   * Use automatic integration or only provide the worker script for manual setup.
   * In worker-only mode, virtual modules and production code removal are disabled.
   * @default "auto"
   */
  mode?: 'auto' | 'worker-only'
  serviceWorker?: {
    /**
     * URL to serve the worker script at.
     * @default "/mockServiceWorker.js"
     */
    url?: string
  }
}

/**
 * A Vite plugin for Mock Service Worker.
 *
 * @example
 * // vite.config.ts
 * import { msw } from 'msw/vite'
 *
 * export default defineConfig({
 *   plugins: [msw()]
 * })
 *
 * @example
 * // src/{client,server}.ts
 * import { network } from 'virtual:msw'
 * import { handlers } from './mocks/handlers'
 *
 * network.configure({ handlers })
 * await network.enable()
 *
 * @remarks
 * In auto mode, production builds remove network setup and its exclusively used imports.
 * No worker script is served or written.
 *
 * For application TypeScript projects that do not include the Vite config,
 * add `/// <reference types="msw/vite/client" />` to an included declaration file.
 */
export function msw(options: MswPluginOptions = {}): Plugin {
  const mode = options.mode ?? 'auto'
  const workerUrl = options.serviceWorker?.url ?? DEFAULT_WORKER_URL
  let isProduction = false

  return {
    name: 'msw',
    enforce: 'post',
    transform(code, id) {
      if (
        mode === 'worker-only' ||
        !isProduction ||
        !code.includes(VIRTUAL_MODULE_ID)
      ) {
        return
      }

      const result = stripNetwork(code, id, this.parse(code))

      if (result?.code != null) {
        return { code: result.code, map: result.map }
      }
    },
    async resolveId(id) {
      if (mode === 'worker-only') {
        return
      }

      if (id === VIRTUAL_OPTIONS_ID) {
        return `\0${VIRTUAL_OPTIONS_ID}`
      }

      if (id === VIRTUAL_MODULE_ID) {
        if (!isProduction) {
          return this.resolve(RUNTIME_PATH)
        }

        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },
    load(id) {
      if (mode === 'worker-only') {
        return
      }

      if (id === RESOLVED_VIRTUAL_MODULE_ID && isProduction) {
        return {
          code: 'export const network = undefined',
          moduleSideEffects: false,
        }
      }

      if (id !== `\0${VIRTUAL_OPTIONS_ID}`) {
        return
      }

      const isServer = this.environment.config.consumer === 'server'
      const integration = isServer ? 'msw/node' : 'msw/browser'
      const hasCustomWorkerUrl = !isServer && workerUrl !== DEFAULT_WORKER_URL

      if (!hasCustomWorkerUrl) {
        return `export { defaultNetworkOptions } from '${integration}'`
      }

      return `
import { createDefaultNetworkOptions } from '${integration}'
export const defaultNetworkOptions = createDefaultNetworkOptions(${JSON.stringify(workerUrl)})
`
    },
    async configResolved(config) {
      isProduction = config.isProduction

      if (isProduction || config.command !== 'build' || !config.publicDir) {
        return
      }

      const workerScript = fs.readFileSync(WORKER_SCRIPT_PATH, 'utf8')
      const workerPath = path.join(config.publicDir, workerUrl)
      await fs.promises.mkdir(path.dirname(workerPath), { recursive: true })
      await fs.promises.writeFile(workerPath, workerScript)
    },
    configureServer(server) {
      if (isProduction) {
        return
      }

      const workerScript = fs.readFileSync(WORKER_SCRIPT_PATH, 'utf8')
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
