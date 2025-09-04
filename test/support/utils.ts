import url from 'node:url'
import path from 'node:path'
import { ClientRequest, IncomingMessage } from 'http'

export function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export function fromTemp(...segments: string[]) {
  return url.fileURLToPath(
    new URL(path.join('../..', 'tmp', ...segments), import.meta.url),
  )
}

export async function waitForClientRequest(request: ClientRequest): Promise<{
  response: IncomingMessage
  responseText: string
}> {
  return new Promise((resolve, reject) => {
    request.once('error', (error) => {
      /**
       * @note Since Node.js v20, Node.js may throw an AggregateError
       * that doesn't have the `message` property and thus won't be handled
       * here correctly. Instead, use the error's `code` as the rejection reason.
       * The code stays consistent across Node.js versions.
       */
      reject('code' in error ? error.code : error)
    })
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
