import * as fs from 'fs'
import * as path from 'path'
import { WebpackHttpServer } from 'webpack-http-server'
import { getWorkerScriptPatch } from './workerConsole'

const { SERVICE_WORKER_BUILD_PATH } = require('../../../config/constants.js')

declare global {
  // eslint-disable-next-line
  var webpackServerPromise: Promise<WebpackHttpServer> | null
}

globalThis.webpackServerPromise = null

export async function getWebpackServer(): Promise<WebpackHttpServer> {
  if (globalThis.webpackServerPromise) {
    return globalThis.webpackServerPromise
  }

  globalThis.webpackServerPromise = startWebpackServer()

  return globalThis.webpackServerPromise
}

export async function startWebpackServer(): Promise<WebpackHttpServer> {
  const workerScriptPatch = getWorkerScriptPatch()

  const server = new WebpackHttpServer({
    before(app) {
      // Prevent Express from responding with cached 304 responses.
      app.set('etag', false)

      app.get('/mockServiceWorker.js', (req, res) => {
        res.set('Content-Type', 'application/javascript; charset=utf8')
        res.set('Content-Encoding', 'chunked')

        const readable = fs.createReadStream(SERVICE_WORKER_BUILD_PATH)
        // Apply the worker script patch to forward console messages
        // from the worker to all its clients.
        readable.push(workerScriptPatch, 'utf8')
        readable.pipe(res)
      })
    },
    webpackConfig: {
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: [
              {
                loader: 'esbuild-loader',
                options: {
                  loader: 'ts',
                  tsconfigRaw: require('../../tsconfig.json'),
                },
              },
            ],
          },
        ],
      },
      resolve: {
        alias: {
          msw: path.resolve(__dirname, '../../..'),
        },
        extensions: ['.ts', '.js', '.mjs'],
      },
    },
  })

  await server.listen()

  return server
}
