import * as path from 'path'
import { AddressInfo } from 'net'
import * as fs from 'fs'
import * as chalk from 'chalk'
import * as webpack from 'webpack'
import * as WebpackDevServer from 'webpack-dev-server'
import * as HtmlWebpackPlugin from 'html-webpack-plugin'
import { SERVICE_WORKER_BUILD_PATH } from '../../config/constants'

interface Payload {
  server: WebpackDevServer
  origin: string
}

export interface SpawnServerOptions {
  withRoutes?: WebpackDevServer.Configuration['after']
}

export const spawnServer = (
  mockDefs: string,
  options?: SpawnServerOptions,
): Promise<Payload> => {
  const absoluteMockPath = path.resolve(process.cwd(), mockDefs)
  const mswModulePath = path.resolve(__dirname, '../..')

  console.log(
    `
Loaded mock definition:
%s

Resolved "msw" module to:
%s

Using Service Worker build:
%s
`,
    chalk.magenta(absoluteMockPath),
    chalk.magenta(mswModulePath),
    chalk.magenta(SERVICE_WORKER_BUILD_PATH),
  )

  const mockDefsContent = fs.readFileSync(absoluteMockPath).toString()

  const compiler = webpack({
    mode: 'development',
    target: 'web',
    entry: [path.resolve(__dirname, 'utils'), absoluteMockPath],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          loaders: [
            {
              loader: 'ts-loader',
              options: {
                configFile: path.resolve(__dirname, '../tsconfig.json'),
                transpileOnly: true,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: 'test/support/template/index.html',
        templateParameters: () => ({
          mockDefs: `// ${mockDefs}\n${mockDefsContent}`,
        }),
      }),
    ],
    resolve: {
      alias: {
        msw: mswModulePath,
      },
      extensions: ['.ts', '.js'],
    },
  })

  const wds = new WebpackDevServer(compiler, {
    contentBase: path.resolve(__dirname, '../..'),
    publicPath: '/',
    noInfo: true,
    openPage: '/test/support/template/index.html',
    headers: {
      // Allow for the test-only Service Workers from "/tmp" directory
      // to be registered at the website's root.
      'Service-Worker-Allowed': '/',
    },
    after(app, server, compiler) {
      app.get('/mockServiceWorker.js', (req, res) => {
        res.sendFile(SERVICE_WORKER_BUILD_PATH)
      })

      if (options?.withRoutes) {
        options.withRoutes(app, server, compiler)
      }
    },
  })

  return new Promise((resolve, reject) => {
    const server = wds.listen(0, 'localhost', (error) => {
      if (error) {
        return reject(error)
      }

      const { port } = server.address() as AddressInfo
      const origin = `http://localhost:${port}`

      console.log(
        `
Server established at %s
`,
        chalk.cyan(origin),
      )

      resolve({ server: wds, origin })
    })
  })
}
