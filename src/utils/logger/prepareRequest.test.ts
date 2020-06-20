import { Headers } from 'headers-utils'
import { prepareRequest } from './prepareRequest'

test('converts request headers into an object', () => {
  const req = prepareRequest({
    url: new URL('http://test.mswjs.io/user'),
    method: 'GET',
    headers: new Headers({
      'Content-Type': 'application/json',
      'X-Header': 'secret',
    }),
    mode: 'same-origin',
    keepalive: true,
    cache: 'default',
    destination: 'document',
    integrity: '',
    credentials: 'same-origin',
    redirect: 'follow',
    referrer: '',
    referrerPolicy: 'no-referrer',
    body: 'text-body',
    bodyUsed: false,
    params: {},
  })

  // Converts `Headers` instance into inspectable object
  expect(req).toHaveProperty('headers', {
    'content-type': 'application/json',
    'x-header': 'secret',
  })
})
