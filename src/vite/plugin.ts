import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Plugin } from 'vite'
import { stripNetwork } from './strip-network'

const DEFAULT_WORKER_URL = '/mockServiceWorker.js'
const WORKER_SCRIPT_PATH = new URL('../mockServiceWorker.js', import.meta.url)
const VIRTUAL_MODULE_ID = 'virtual:msw'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

export interface MswPluginOptions {
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
 * In production, network setup and its exclusively used imports are removed.
 * No worker script is served or written.
 *
 * For application TypeScript projects that do not include the Vite config,
 * add `/// <reference types="msw/vite/client" />` to an included declaration file.
 */
export function msw(options: MswPluginOptions = {}): Plugin {
  const workerUrl = options.serviceWorker?.url ?? DEFAULT_WORKER_URL
  let isProduction = false

  return {
    name: 'msw',
    enforce: 'post',
    transform(code, id) {
      if (!isProduction || !code.includes(VIRTUAL_MODULE_ID)) {
        return
      }

      const result = stripNetwork(code, id)

      if (result?.code != null) {
        return { code: result.code, map: result.map }
      }
    },
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return
      }

      if (isProduction) {
        return {
          code: 'export const network = undefined',
          moduleSideEffects: false,
        }
      }

      const isServer = this.environment.config.consumer === 'server'
      const integration = isServer ? 'msw/node' : 'msw/browser'
      const hasCustomWorkerUrl = !isServer && workerUrl !== DEFAULT_WORKER_URL
      const optionsImport = hasCustomWorkerUrl
        ? 'createDefaultNetworkOptions'
        : 'defaultNetworkOptions'
      const networkOptions = hasCustomWorkerUrl
        ? `createDefaultNetworkOptions(${JSON.stringify(workerUrl)})`
        : 'defaultNetworkOptions'

      return `
import { defineNetwork, NetworkReadyState } from 'msw/experimental'
import { ${optionsImport} } from '${integration}'

export const network = defineNetwork(${networkOptions})

if (import.meta.hot) {
  let resumeAfterUpdate = false

  const disableNetwork = async () => {
    if (network.readyState === NetworkReadyState.ENABLED) {
      await network.disable()
    }
  }

  const beforeUpdate = async () => {
    resumeAfterUpdate = network.readyState === NetworkReadyState.ENABLED
    await disableNetwork()
  }

  const afterUpdate = async () => {
    const shouldResume = resumeAfterUpdate
    resumeAfterUpdate = false

    if (shouldResume && network.readyState === NetworkReadyState.DISABLED) {
      await network.enable()
    }
  }

  import.meta.hot.on('vite:beforeUpdate', beforeUpdate)
  import.meta.hot.on('vite:afterUpdate', afterUpdate)
  import.meta.hot.on('vite:beforeFullReload', disableNetwork)
  import.meta.hot.dispose(async () => {
    resumeAfterUpdate = false
    import.meta.hot.off('vite:beforeUpdate', beforeUpdate)
    import.meta.hot.off('vite:afterUpdate', afterUpdate)
    import.meta.hot.off('vite:beforeFullReload', disableNetwork)
    await disableNetwork()
  })
}
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
