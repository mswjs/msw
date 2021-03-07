import { Headers } from 'headers-utils'
import { MockedRequest } from './../../src'
import { uuidv4 } from '../../src/utils/internal/uuidv4'
import { ChildProcess } from 'child_process'

const TIMEOUT = 3000
const RETRY_INTERVAL = 1000

export function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
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
    ...init,
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

export function waitUntil(expectation: () => void) {
  const maxTries = Math.ceil(TIMEOUT / RETRY_INTERVAL)
  let tries = 0
  return new Promise((resolve, reject) => {
    const rejectOrRerun = (error: unknown) => {
      if (tries > maxTries) {
        reject(error)
        return
      }
      setTimeout(runExpectation, RETRY_INTERVAL)
    }
    function runExpectation() {
      tries += 1
      try {
        Promise.resolve<void>(expectation()).then(resolve).catch(rejectOrRerun)
      } catch (error) {
        rejectOrRerun(error)
      }
    }
    setTimeout(runExpectation, 0)
  })
}
