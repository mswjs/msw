import * as path from 'path'
import { ChildProcess } from 'child_process'
import { ClientRequest, IncomingMessage } from 'http'

export function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export function fromTemp(...segments: string[]) {
  return path.join(__dirname, '../..', 'tmp', ...segments)
}

export function promisifyChildProcess(
  child: ChildProcess,
  options?: { pipeStdio: boolean },
) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    if (options?.pipeStdio) {
      child.stdout?.pipe(process.stdout)
      child.stderr?.pipe(process.stderr)
    }

    child.stdout?.on('data', (chunk) => (stdout += chunk))
    child.stderr?.on('data', (chunk) => (stderr += chunk))

    child.addListener('error', reject)
    child.addListener('disconnect', reject)
    child.addListener('close', reject)
    child.addListener('exit', () => {
      resolve({ stdout, stderr })
    })
  })
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
