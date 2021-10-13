/**
 * @jest-environment node
 */
import { getRequestCookies } from './getRequestCookies'
import { createMockedRequest } from '../../../test/support/utils'

beforeAll(() => {
  // Node applications performing Server-Side Rendering of front-end applications
  // might have to polyfill some browser globals like document, location etc.
  global.location = {
    href: 'https://google.nl',
    origin: 'https://google.nl',
  } as Location
})

afterAll(() => {
  global.location = undefined as unknown as Location
})

test('returns empty object when in a node environment with polyfilled location object', () => {
  const cookies = getRequestCookies(
    createMockedRequest({
      url: new URL(`${location.origin}/user`),
      credentials: 'include',
    }),
  )

  expect(cookies).toEqual({})
})
