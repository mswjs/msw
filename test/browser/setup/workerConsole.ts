import { format } from 'outvariant'
import { Emitter } from 'strict-event-emitter'
import { type Page } from '@playwright/test'

export type WorkerConsoleMessageType =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'debug'
  | 'trace'
  | 'dir'
  | 'dirxml'
  | 'table'
  | 'clear'
  | 'startGroup'
  | 'startGroupCollapsed'
  | 'endGroup'
  | 'assert'
  | 'count'
  | 'countReset'
  | 'time'
  | 'timeLog'
  | 'timeEnd'
  | 'group'
  | 'groupCollapsed'
  | 'groupEnd'
  | 'profile'
  | 'profileEnd'
  | 'timeline'
  | 'timelineEnd'
  | 'timeStamp'
  | 'context'
  | 'memory'

type WorkerConsoleEventMap = {
  [MessageType in WorkerConsoleMessageType]: [message: string]
}

type InternalWorkerConsoleMessageData = {
  type: 'internal/console'
  payload: {
    messageType: WorkerConsoleMessageType
    args: Array<string>
  }
}

declare global {
  interface Window {
    handleIncomingWorkerConsoleMessage: (
      messageType: WorkerConsoleMessageType,
      args: Array<string>,
    ) => void
  }
}

export class WorkerConsole extends Emitter<WorkerConsoleEventMap> {
  public messages: Map<WorkerConsoleMessageType, Array<string>> = new Map()

  private addMessage(
    messageType: WorkerConsoleMessageType,
    message: string,
  ): void {
    const messages = this.messages.get(messageType) || []
    this.messages.set(messageType, messages.concat(message))
  }

  public async init(page: Page): Promise<void> {
    // Ensure the worker is activated before establishing the listener.
    await page.evaluate(() => {
      if (navigator.serviceWorker.controller) {
        // Only await the worker if it actually exists.
        // This prevents the WorkerConsole from throwing
        // when initialized in the scenarios where MSW is
        // expected to fail/skip registration. Respectively,
        // no console message forwarding will be established.
        return navigator.serviceWorker.ready
      }
    })

    await page.exposeFunction(
      'handleIncomingWorkerConsoleMessage',
      (messageType: WorkerConsoleMessageType, args: Array<string>) => {
        const [template, ...positionals] = args
        const formattedMessage = format(template, ...positionals)

        this.addMessage(messageType, formattedMessage)
        this.emit(messageType, formattedMessage)
      },
    )

    await page.evaluate(() => {
      navigator.serviceWorker.addEventListener(
        'message',
        (event: MessageEvent<InternalWorkerConsoleMessageData>) => {
          const { data } = event

          if (data.type === 'internal/console') {
            const { messageType, args } = data.payload
            window.handleIncomingWorkerConsoleMessage(messageType, args)
          }
        },
      )
    })
  }

  public removeAllListeners(...args: Array<any>) {
    this.messages.clear()
    return super.removeAllListeners(...args)
  }
}

/**
 * @why Service Worker lives in a separate thread and doesn't
 * trigger the Playwright's page console events. No way to access
 * the console events issued in the worker.
 * @see https://github.com/microsoft/playwright/issues/6559
 * @see https://stackoverflow.com/questions/54339039/puppeteer-can-not-listen-service-workers-console
 */
export function getWorkerScriptPatch(): string {
  return `
// EVERYTHING BELOW THIS LINE HAS BEEN APPENDED
// TO FORWARD WORKER CONSOLE MESSAGES TO THE CLIENTS.

async function sendToAll(payload) {
  const clients = await self.clients.matchAll()
  for (const client of clients) {
    client.postMessage(payload)
  }
}

function interceptConsoleCalls(listener) {
  globalThis.console = new Proxy(globalThis.console, {
    get(target, property) {
      if (property in target) {
        return (...args) => {
          listener(property, args)
          return Reflect.get(target, property)
        }
      }
    },
  })
}

interceptConsoleCalls((messageType, args) => {
  sendToAll({
    type: 'internal/console',
    payload: { messageType, args }
  })
})
  `
}
