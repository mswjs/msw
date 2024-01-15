import * as path from 'path'
import { ClientRequest, IncomingMessage } from 'http'

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
