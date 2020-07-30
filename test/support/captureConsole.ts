import { Page, ConsoleMessageType } from 'puppeteer'

export type Messages = Record<ConsoleMessageType, string[]>
export type ConsolePredicate = (
  text: string,
  type: ConsoleMessageType,
) => boolean

export function captureConsole(
  page: Page,
  predicate: ConsolePredicate = () => true,
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
    if (predicate(message.text(), message.type())) {
      const type = message.type()
      const text = message.text()

      messages[type] = messages[type].concat(removeConsoleStyles(text))
    }
  })

  return {
    messages,
  }
}

export const filterLibraryLogs = (text: string) => {
  return text.startsWith('[MSW]')
}

export function removeConsoleStyles(message: string): string {
  return message.replace(/\(*(%s|%c|color:\S+)\)*\s*/g, '').trim()
}
