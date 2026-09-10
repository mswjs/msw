import fs from 'node:fs'
import url from 'node:url'
import crypto from 'node:crypto'
import express, {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
  type Router,
} from 'express'
import { createServer, type ViteDevServer } from 'vite'
import { msw } from '../../lib/vite/index.js'

export interface Compilation {
  previewUrl: string
  use(registerMiddleware: (router: Router) => void): void
  dispose(): Promise<void>
}

export interface CompilationOptions {
  markup?: string
}

export interface InlineCompilationEntry {
  source: string
}

export type CompilationEntry = string | URL | InlineCompilationEntry

export interface ViteHttpServer {
  serverUrl: string
  compile(
    entry: CompilationEntry | Array<CompilationEntry>,
    options?: CompilationOptions,
  ): Promise<Compilation>
  close(): Promise<void>
}

interface CompilationRecord {
  app: express.Express
  markup: string
  router: Router
  script: string
}

function resolveEntryPath(entry: string | URL): string {
  if (entry instanceof URL) {
    return url.fileURLToPath(entry)
  }

  return entry
}

function resolveMarkup(markup: string | undefined): string {
  if (!markup) {
    return '<!doctype html><html><head></head><body></body></html>'
  }

  if (fs.existsSync(markup)) {
    return fs.readFileSync(markup, 'utf8')
  }

  return markup
}

function injectEntries(markup: string, entries: Array<string>): string {
  const entryScript = entries
    .map((entry) => {
      return `await import(${JSON.stringify(entry)})`
    })
    .join('\n')
  const entryScripts = `<script type="module">${entryScript}</script>`

  if (markup.includes('</body>')) {
    return markup.replace('</body>', `${entryScripts}</body>`)
  }

  return `${markup}${entryScripts}`
}

export async function createViteHttpServer(): Promise<ViteHttpServer> {
  const compilations = new Map<string, CompilationRecord>()
  const inlineModules = new Map<string, string>()
  const inlineModulePrefix = 'virtual:msw-test:'
  const compilationPlugin = {
    name: 'msw:test-compilations',
    resolveId(id: string) {
      if (id.startsWith(inlineModulePrefix)) {
        return `\0${id}`
      }
    },
    load(id: string) {
      if (id.startsWith(`\0${inlineModulePrefix}`)) {
        return inlineModules.get(id.slice(1))
      }
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url ?? '/', 'http://localhost')
        const [, compilationId, ...pathSegments] =
          requestUrl.pathname.split('/')
        const compilation = compilations.get(compilationId)

        if (!compilation) {
          next()
          return
        }

        if (pathSegments.length === 0 || pathSegments.join('/') === '') {
          response.writeHead(200, {
            'content-type': 'text/html; charset=utf-8',
          })
          response.end(compilation.markup)
          return
        }

        if (pathSegments.join('/') === 'main.js') {
          response.writeHead(200, {
            'access-control-allow-origin': '*',
            'content-type': 'application/javascript; charset=utf-8',
          })
          response.end(compilation.script)
          return
        }

        const originalRequestUrl = request.url
        request.url = `/${pathSegments.join('/')}${requestUrl.search}`

        compilation.app(
          request as ExpressRequest,
          response as ExpressResponse,
          () => {
            request.url = originalRequestUrl
            next()
          },
        )
      })
    },
  }

  const viteServer = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'silent',
    plugins: [compilationPlugin, msw()],
    server: {
      cors: true,
      host: '127.0.0.1',
      port: 0,
    },
  })
  await viteServer.listen()

  const serverUrl = viteServer.resolvedUrls?.local[0]

  if (!serverUrl) {
    await viteServer.close()
    throw new Error('Failed to resolve the Vite test server URL')
  }

  return {
    serverUrl,
    async compile(entry, options = {}) {
      const compilationId = crypto.randomUUID()
      const entries = Array.isArray(entry) ? entry : [entry]
      const inlineModuleIds: Array<string> = []
      const entryPaths = entries.map((entry, index) => {
        if (typeof entry === 'object' && !(entry instanceof URL)) {
          const inlineModuleId = `${inlineModulePrefix}${compilationId}-${index}.ts`
          inlineModules.set(inlineModuleId, entry.source)
          inlineModuleIds.push(inlineModuleId)
          return `/@id/${inlineModuleId}`
        }

        return `/@fs${resolveEntryPath(entry)}`
      })
      const markup = injectEntries(resolveMarkup(options.markup), entryPaths)
      const script = entryPaths
        .map((entryPath) => {
          const entryUrl = new URL(entryPath, serverUrl)
          return `import(${JSON.stringify(entryUrl.href)})`
        })
        .join('\n')
      const app = express()
      const router = express.Router()
      app.disable('etag')
      app.use(router)

      compilations.set(compilationId, { app, markup, router, script })

      return {
        previewUrl: new URL(`/${compilationId}/`, serverUrl).href,
        use(registerMiddleware) {
          registerMiddleware(router)
        },
        async dispose() {
          compilations.delete(compilationId)
          for (const inlineModuleId of inlineModuleIds) {
            inlineModules.delete(inlineModuleId)
          }
        },
      }
    },
    async close() {
      await viteServer.close()
    },
  }
}
