import * as path from 'path'
import { AddressInfo } from 'net'
import * as fs from 'fs'
import * as chalk from 'chalk'
import * as webpack from 'webpack'
import * as WebpackDevServer from 'webpack-dev-server'
import * as HtmlWebpackPlugin from 'html-webpack-plugin'
import * as packageJson from '../../package.json'

export interface SpawnServerAPI {
  server: WebpackDevServer
  origin: string
  closeServer: () => Promise<void>
}

export const spawnServer = (mockDefs: string): Promise<SpawnServerAPI> => {
  const absoluteMockPath = path.resolve(process.cwd(), mockDefs)
  const mswModulePath = path.resolve(__dirname, '../..', packageJson.main)

  console.log(
    `
Loaded mock definition:
%s

Resolved "msw" module to:
%s`,
    chalk.magenta(absoluteMockPath),
    chalk.magenta(mswModulePath),
  )

  const mockDefsContent = fs.readFileSync(absoluteMockPath).toString()

  const compiler = webpack({
    mode: 'development',
    target: 'web',
    entry: {
      index: [path.resolve(__dirname, 'utils'), absoluteMockPath],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
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
        template: 'test/support/index.html',
        templateParameters: () => ({
          mockDefs: `// ${mockDefs}\n${mockDefsContent}`,
        }),
      }),
      new webpack.LoaderOptionsPlugin({
        options: {
          resolve: {
            extensions: ['.ts', '.js'],
          },
        },
      }),
    ],
    optimization: {
      minimize: false,
      splitChunks: false,
    },
    resolve: {
      alias: {
        msw: mswModulePath,
      },
      extensions: ['.ts', '.js'],
    },
    devtool: false,
  })

  const wds = new WebpackDevServer(compiler, {
    historyApiFallback: true,
    contentBase: path.resolve(__dirname, '../..'),
    publicPath: '/',
    noInfo: true,
    hot: false,
    openPage: '/test/support/index.html',
    headers: {
      // Allow for the test-only Service Workers from "/tmp" directory
      // to be registered at the website's root.
      'Service-Worker-Allowed': '/',
    },
    after(app) {
      app.get('/mockServiceWorker.js', (_, res) => {
        res.sendFile(path.resolve(__dirname, '../../lib/mockServiceWorker.js'))
      })
    },
  })

  const closeServer = () => {
    return new Promise<void>((resolve, reject) => {
      try {
        wds.close(resolve)
      } catch (error) {
        reject(error)
      }
    })
  }

  return new Promise((resolve, reject) => {
    // Await for the compilation to finish before spawning the server.
    // This prevents Puppeteer from waiting until the bundling is done
    // when requesting to open the page that WDS serves.
    compiler.hooks.done.tap('SpawnServer', () => {
      const serverInstance = wds.listen(0, 'localhost', (error) => {
        if (error) {
          return reject(error)
        }

        const { port } = serverInstance.address() as AddressInfo
        const origin = `http://localhost:${port}`

        console.log(
          `
  Server established at %s
  `,
          chalk.cyan(origin),
        )

        resolve({
          server: wds,
          origin,
          closeServer,
        })
      })
    })
  })
}
