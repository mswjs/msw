import { IsomorphicRequest } from '@mswjs/interceptors'
import { encodeBuffer } from '@mswjs/interceptors/lib/utils/bufferUtils'
import { Headers } from 'headers-polyfill'
import { MockedRequest } from '../../handlers/RequestHandler'
import { prepareRequest } from './prepareRequest'

test('converts request headers into an object', () => {
  const isomorphicRequest = new IsomorphicRequest(
    new URL('http://test.mswjs.io/user'),
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'X-Header': 'secret',
      }),
      body: encodeBuffer('text-body'),
    },
  )
  const request = prepareRequest(new MockedRequest(isomorphicRequest))

  // Converts `Headers` instance into inspectable object
  expect(request).toHaveProperty('headers', {
    'content-type': 'application/json',
    'x-header': 'secret',
  })
})
