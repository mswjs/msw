/**
 * @jest-environment node
 */
import { getRequestCookies } from './getRequestCookies'
import { createMockedRequest } from '../../../test/support/utils'

const prevLocation = global.location

beforeAll(() => {
  // Node.js applications may polyfill some browser globals (document, location)
  // when performing Server-Side Rendering of front-end applications.
  global.location = {
    href: 'https://mswjs.io',
    origin: 'https://mswjs.io',
  } as Location
})

afterAll(() => {
  global.location = prevLocation
})

test('returns empty object when in a node environment with polyfilled location object', () => {
  const cookies = getRequestCookies(
    createMockedRequest({
      url: new URL('/user', location.origin),
      credentials: 'include',
    }),
  )

  expect(cookies).toEqual({})
})
