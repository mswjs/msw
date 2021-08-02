import * as fs from 'fs'
import * as path from 'path'
import { CreateBrowserApi, createBrowser } from 'page-with'
import { ServerApi } from '@open-draft/test-server'
import { SERVICE_WORKER_BUILD_PATH } from '../config/constants'
import {
  createWorkerConsoleServer,
  workerConsoleSpy,
} from './support/workerConsole'

let browser: CreateBrowserApi
let workerConsoleServer: ServerApi

beforeAll(async () => {
  workerConsoleServer = await createWorkerConsoleServer()

  browser = await createBrowser({
    serverOptions: {
      router(app) {
        // Prevent Express from responding with cached 304 responses.
        app.set('etag', false)

        app.get('/mockServiceWorker.js', (req, res) => {
          const workerScript = fs.readFileSync(
            SERVICE_WORKER_BUILD_PATH,
            'utf8',
          )

          // Edit the worker script to signal any console messages
          // to the standalone server. This way tests can spy on the
          // console messages from the worker.
          res.set('Content-Type', 'application/javascript').send(`
${workerScript}

// EVERYTHING BELOW THIS LINE IS APPENDED TO THE WORKER SCRIPT
// ONLY DURING THE TEST RUN.
const originals = {}
Object.keys(console).forEach((methodName) => {
  originals[methodName] = console[methodName]
  console[methodName] = (...args) => {
    fetch('${workerConsoleServer.http.makeUrl('/console/')}' + methodName, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args)
    })

    originals[methodName](...args)
  }
})
`)
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

afterEach(() => {
  workerConsoleSpy.clear()
})

afterAll(async () => {
  await browser.cleanup()
  await workerConsoleServer.close()
})
