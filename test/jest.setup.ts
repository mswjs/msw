import * as path from 'path'
import { CreateBrowserApi, createBrowser } from 'page-with'
import { SERVICE_WORKER_BUILD_PATH } from '../config/constants'

let browser: CreateBrowserApi

beforeAll(async () => {
  browser = await createBrowser({
    serverOptions: {
      router(app) {
        // Prevent Express from responding with cached 304 responses.
        app.set('etag', false)

        app.get('/mockServiceWorker.js', (req, res) => {
          res.sendFile(SERVICE_WORKER_BUILD_PATH)
        })
      },
      webpackConfig: {
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              exclude: /node_modules/,
              use: [
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
        resolve: {
          alias: {
            msw: path.resolve(__dirname, '..'),
          },
          extensions: ['.ts', '.js'],
        },
      },
    },
  })
})

afterAll(async () => {
  await browser.cleanup()
})
