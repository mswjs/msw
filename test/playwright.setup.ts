import { HttpServer } from '@open-draft/test-server/http'
import * as fs from 'fs'
import * as path from 'path'
import { WebpackHttpServer } from 'webpack-http-server'

const { SERVICE_WORKER_BUILD_PATH } = require('../config/constants.js')

const apiServer = new HttpServer((app) => {
  app.get('/', (req, res) => {
    res.send('Test HTTP server')
  })
})

export const webpackServer = new WebpackHttpServer({
  before(app) {
    app.get('/mockServiceWorker.js', (req, res) => {
      const readable = fs.createReadStream(SERVICE_WORKER_BUILD_PATH)
      res.set('Content-Type', 'application/javascript; charset=utf8')
      res.set('Content-Encoding', 'chunked')
      readable.pipe(res)
    })
  },
  webpackConfig: {
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, '..', 'tsconfig.json'),
                transpileOnly: true,
              },
            },
          ],
        },
      ],
    },
    resolve: {
      alias: {
        msw: path.resolve(__dirname, '..'),
      },
      extensions: ['.ts', '.js'],
    },
  },
})

export default async function globalSetup() {
  // Start compile and API servers.
  await Promise.all([webpackServer.listen(), apiServer.listen()])

  console.log(`Test servers are running!

- Webpack server: ${webpackServer.serverUrl}
- API server: ${apiServer.http.address.href}
`)

  // Store the webpack server URL so that custom fixtures
  // could access it. Sharing a server instance won't work
  // because global setup and fixtures run in different processes.
  process.env.WEBPACK_SERVER_URL = webpackServer.serverUrl

  return async () => {
    await Promise.all([webpackServer.close(), apiServer.close()])
  }
}
