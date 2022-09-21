import { format } from 'outvariant'
import { ConsoleMessageType } from 'page-with'
import { HttpServer } from '@open-draft/test-server/http'

type WorkerConsoleSpy = Map<ConsoleMessageType, string[]>

export interface WorkerConsole {
  server: HttpServer
  consoleSpy: WorkerConsoleSpy
}

/**
 * Create a designated HTTP server to propagate `console` calls from the worker script
 * to the test runtime. This allows assertions on the console messages from the worker.
 *
 * @why Service Worker lives in a separate thread and doesn't trigger
 * the Playwright's page console events. No way to access console events
 * issued in the worker.
 * @see https://github.com/microsoft/playwright/issues/6559
 * @see https://stackoverflow.com/questions/54339039/puppeteer-can-not-listen-service-workers-console
 */

export async function createWorkerConsoleServer(): Promise<WorkerConsole> {
  const workerConsoleSpy = new Map() as WorkerConsoleSpy

  const workerConsoleServer = new HttpServer((app) => {
    app.use((req, res, next) => {
      // Configure CORS so that localhost can issue cross-port requests
      // during the test runs.
      res.setHeader('Access-Control-Allow-Origin', '*')
      next()
    })

    app.get('/', (_, res) => {
      res.send(
        'This is a server that proxies "console" calls from the Service Worker.',
      )
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

  await workerConsoleServer.listen()

  return {
    server: workerConsoleServer,
    consoleSpy: workerConsoleSpy,
  }
}

// Map certain console methods to "ConsoleMessageType".
const consoleMessageTypeOverrides: Partial<
  Record<keyof typeof console, ConsoleMessageType>
> = {
  warn: 'warning',
}
