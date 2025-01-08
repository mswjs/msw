import * as path from 'node:path'
import { ClientRequest, IncomingMessage } from 'node:http'
import { vi, afterEach } from 'vitest'
import { LifeCycleEventsMap, SetupApi } from 'msw'

export function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export function fromTemp(...segments: string[]) {
  return path.join(__dirname, '../..', 'tmp', ...segments)
}

export function clearCookies(): void {
  document.cookie.split(';').forEach((cookie) => {
    document.cookie = cookie
      .replace(/^ +/, '')
      .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`)
  })
}

export async function waitForClientRequest(request: ClientRequest): Promise<{
  response: IncomingMessage
  responseText: string
}> {
  return new Promise((resolve, reject) => {
    request.once('error', reject)
    request.once('abort', () => reject(new Error('Request was aborted')))

    request.on('response', (response) => {
      response.once('error', reject)

      const responseChunks: Array<Buffer> = []

      response.on('data', (chunk) => {
        responseChunks.push(Buffer.from(chunk))
      })
      response.once('end', () => {
        resolve({
          response,
          responseText: Buffer.concat(responseChunks).toString('utf8'),
        })
      })
    })
  })
}

export function spyOnLifeCycleEvents(api: SetupApi<LifeCycleEventsMap>) {
  const listener = vi.fn()
  afterEach(() => listener.mockReset())

  const wrapListener = (eventName: string) => {
    return (...args: Array<any>) => listener(eventName, ...args)
  }

  api.events
    .on('request:start', wrapListener('request:start'))
    .on('request:match', wrapListener('request:match'))
    .on('request:unhandled', wrapListener('request:unhandled'))
    .on('request:end', wrapListener('request:end'))
    .on('response:mocked', wrapListener('response:mocked'))
    .on('response:bypass', wrapListener('response:bypass'))
    .on('unhandledException', wrapListener('unhandledException'))

  return listener
}
