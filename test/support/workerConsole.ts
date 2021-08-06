import { ConsoleMessageType } from 'page-with/lib/utils/spyOnConsole'
import { ServerApi, createServer } from '@open-draft/test-server'
import { format } from 'outvariant'

let workerConsoleServer: ServerApi
export const workerConsoleSpy = new Map<ConsoleMessageType, string[]>()
export const workerConsoleIdle = Promise.resolve()

// Map certain console methods to "ConsoleMessageType".
const consoleMessageTypeOverrides = {
  warn: 'warning',
}

/**
 * Create a designated HTTP server to propagate "console" calls from the worker script
 * to the test runtime. This allows assertions on the console messages from the worker.
 *
 * @why Service Worker lives in a separate thread and doesn't trigger
 * the Playwright's page console events. No way to access console events
 * issues in the worker.
 * @see https://github.com/microsoft/playwright/issues/6559
 * @see https://stackoverflow.com/questions/54339039/puppeteer-can-not-listen-service-workers-console
 */
export async function createWorkerConsoleServer() {
  workerConsoleServer = await createServer((app) => {
    app.use((req, res, next) => {
      // Configure CORS so that localhost can issue cross-port requests
      // during the test runs.
      res.setHeader('Access-Control-Allow-Origin', '*')
      next()
    })

    app.post('/console/:messageType', (req, res) => {
      const { messageType } = req.params
      const resolvedMessageType =
        consoleMessageTypeOverrides[messageType] || messageType
      const [template, ...positionals] = req.body
      const resolvedMessage = format(template, ...positionals)

      workerConsoleSpy.set(
        resolvedMessageType,
        (workerConsoleSpy.get(resolvedMessageType) || []).concat(
          resolvedMessage,
        ),
      )

      return res.status(200).end()
    })
  })

  return workerConsoleServer
}
