import { Page, ConsoleMessage, ConsoleMessageType } from 'puppeteer'

export type Messages = Record<ConsoleMessageType, string[]>

export function captureConsole(
  page: Page,
  predicate: (message: ConsoleMessage) => boolean = () => true,
) {
  const messages: Messages = {
    info: [],
    log: [],
    debug: [],
    error: [],
    warning: [],
    profile: [],
    profileEnd: [],
    table: [],
    trace: [],
    timeEnd: [],
    startGroup: [],
    startGroupCollapsed: [],
    endGroup: [],
    dir: [],
    dirxml: [],
    clear: [],
    count: [],
    assert: [],
  }

  page.on('console', (message) => {
    if (predicate(message)) {
      const type = message.type()
      const text = message.text()

      messages[type] = messages[type].concat(removeConsoleStyles(text))
    }
  })

  return {
    messages,
  }
}

export function filterLibraryLogs(message: ConsoleMessage) {
  return message.text().startsWith('[MSW]')
}

export function removeConsoleStyles(message: string): string {
  return message.replace(/\(*(%s|%c|color:\S+)\)*\s*/g, '').trim()
}
