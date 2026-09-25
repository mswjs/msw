import * as fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const WORKER_FILENAME = 'mockServiceWorker.js'
const WORKER_SCRIPT_PATH = new URL('../mockServiceWorker.js', import.meta.url)
const VIRTUAL_MODULE_ID = 'virtual:msw'
const VIRTUAL_OPTIONS_ID = 'virtual:msw/options'
const RUNTIME_PATH = fileURLToPath(new URL('./runtime.js', import.meta.url))

export interface MswPluginOptions {
  /**
   * Use automatic integration or only provide the worker script for manual setup.
   * In worker-only mode, virtual modules are disabled.
   * @default "auto"
   */
  mode?: 'auto' | 'worker-only'
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
 * if (import.meta.env.DEV) {
 *   const { network } = await import('virtual:msw')
 *   const { handlers } = await import('./mocks/handlers')
 *
 *   network.configure({ handlers })
 *   await network.enable()
 * }
 *
 * @remarks
 * The worker script is served during development and emitted next to any
 * client bundle that imports `virtual:msw`. Guard mocking setup with
 * `import.meta.env.DEV` to exclude both from production builds.
 *
 * For application TypeScript projects that do not include the Vite config,
 * add `/// <reference types="msw/vite/client" />` to an included declaration file.
 */
export function msw(options: MswPluginOptions = {}): Plugin {
  const mode = options.mode ?? 'auto'
  let workerUrl = `/${WORKER_FILENAME}`
  const environmentsUsingNetwork = new Set<string>()

  return {
    name: 'msw',
    async resolveId(id) {
      if (mode === 'worker-only') {
        return
      }

      if (id === VIRTUAL_OPTIONS_ID) {
        return `\0${VIRTUAL_OPTIONS_ID}`
      }

      if (id === VIRTUAL_MODULE_ID) {
        return this.resolve(RUNTIME_PATH)
      }
    },
    load(id) {
      if (mode === 'worker-only' || id !== `\0${VIRTUAL_OPTIONS_ID}`) {
        return
      }

      if (this.environment.config.consumer === 'server') {
        return `export { defaultNetworkOptions } from 'msw/node'`
      }

      environmentsUsingNetwork.add(this.environment.name)

      return `
import { createDefaultNetworkOptions } from 'msw/browser'
export const defaultNetworkOptions = createDefaultNetworkOptions(${JSON.stringify(workerUrl)})
`
    },
    configResolved(config) {
      // Keep relative build bases relative and service workers on the app's origin.
      const base =
        config.base === './'
          ? config.base
          : new URL(config.base, 'http://localhost').pathname
      workerUrl = `${base}${WORKER_FILENAME}`
    },
    generateBundle() {
      if (this.environment.config.consumer !== 'client') {
        return
      }

      // In "auto" mode, the worker is only useful to bundles that contain the
      // network. A user guard (e.g. `import.meta.env.DEV`) that drops the
      // `virtual:msw` import drops the worker too.
      if (
        mode === 'auto' &&
        !environmentsUsingNetwork.has(this.environment.name)
      ) {
        return
      }

      this.emitFile({
        type: 'asset',
        fileName: WORKER_FILENAME,
        source: fs.readFileSync(WORKER_SCRIPT_PATH, 'utf8'),
      })
    },
    configureServer(server) {
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
