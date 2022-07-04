import * as path from 'path'
import { ChildProcess } from 'child_process'
import { IsomorphicRequest } from '@mswjs/interceptors'
import { MockedRequest } from '../../src/handlers/RequestHandler'
import { encodeBuffer } from '@mswjs/interceptors/lib/utils/bufferUtils'

export function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export function fromTemp(...segments: string[]) {
  return path.join(__dirname, '../..', 'tmp', ...segments)
}

export function createMockedRequest(
  init: Partial<MockedRequest>,
): MockedRequest {
  const body = encodeBuffer(JSON.stringify(init.body))
  const isomorphicRequest = createIsomorphicRequest(init, body)
  const mockedRequest = new MockedRequest(isomorphicRequest, init)
  return mockedRequest
}

export function createIsomorphicRequest(
  init: Partial<IsomorphicRequest>,
  body = new ArrayBuffer(0),
): IsomorphicRequest {
  const url = init.url || new URL('/', location.href)
  const request = new IsomorphicRequest(url, { ...init, body })
  request.id = init.id || request.id
  return request
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
