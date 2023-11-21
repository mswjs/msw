/**
 * @vitest-environment node
 */
import { getRequestCookies } from './getRequestCookies'

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
    new Request(new URL('/user', location.href), {
      credentials: 'include',
    }),
  )

  expect(cookies).toEqual({})
})
