import { Page, ConsoleMessage } from 'puppeteer'

export function captureConsole(
  page: Page,
  logs: string[],
  predicate: (message: ConsoleMessage) => boolean = () => true,
) {
  page.on('console', (message) => {
    if (predicate(message)) {
      logs.push(removeConsoleStyles(message.text()))
    }
  })
}

export function filterLibraryLogs(message: ConsoleMessage) {
  return message.text().startsWith('[MSW]')
}

export function removeConsoleStyles(message: string): string {
  return message.replace(/\(*(%s|%c|color:\S+)\)*\s*/g, '').trim()
}
