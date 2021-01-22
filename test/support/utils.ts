import { Headers } from 'headers-utils'
import { MockedRequest } from './../../src'
import { uuidv4 } from '../../src/utils/internal/uuidv4'

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
