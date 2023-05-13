import { encodeBuffer } from '@mswjs/interceptors'
import { Headers } from 'headers-polyfill'
import { requestToLoggableObject } from './requestToLoggableObject'

test('serializes given Request instance into a plain object', async () => {
  const request = await requestToLoggableObject(
    new Request(new URL('http://test.mswjs.io/user'), {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'text/plain',
        'X-Header': 'secret',
      }),
      body: encodeBuffer('text-body'),
    }),
  )

  expect(request.method).toBe('POST')
  expect(request.url).toBe('http://test.mswjs.io/user')
  expect(request.headers).toEqual({
    'content-type': 'text/plain',
    'x-header': 'secret',
  })
  expect(request.body).toBe('text-body')
})
