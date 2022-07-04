import * as path from 'path'
import { Headers } from 'headers-polyfill'
import { MockedRequest } from './../../src'
import { uuidv4 } from '../../src/utils/internal/uuidv4'
import { ChildProcess } from 'child_process'
import { IsomorphicRequest } from '@mswjs/interceptors'
import { passthrough } from '../../src/handlers/RequestHandler'

export function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

export function fromTemp(...segments: string[]) {
  return path.join(__dirname, '../..', 'tmp', ...segments)
}

export function createMockedRequest(
  init: Partial<MockedRequest> = {},
): MockedRequest {
  return {
    id: uuidv4(),
    method: 'GET',
    url: new URL('/', location.href),
    headers: new Headers({
      'x-origin': 'msw-test',
    }),
    body: '',
    bodyUsed: false,
    mode: 'same-origin',
    destination: 'document',
    redirect: 'manual',
    referrer: '',
    referrerPolicy: 'origin',
    credentials: 'same-origin',
    cache: 'default',
    integrity: '',
    keepalive: true,
    cookies: {},
    passthrough,
    ...init,
  }
}

export function createIsomorphicRequest(
  initialValues: Partial<IsomorphicRequest> = {},
): IsomorphicRequest {
  return {
    id: uuidv4(),
    method: 'GET',
    url: new URL('/', location.href),
    headers: new Headers(),
    credentials: 'same-origin',
    ...initialValues,
  }
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
