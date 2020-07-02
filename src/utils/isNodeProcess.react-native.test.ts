// @ts-nocheck
/**
 * Test in React Native Environment
 */

import { isNodeProcess } from './isNodeProcess'

test('returns true when run in a react native environment', () => {
  const originalProcess = global.process
  global.process = {
    env: {
      NODE_ENV: 'development',
    },
  }

  const originalNavigator = global.navigator
  Object.defineProperty(global.navigator, 'product', {
    get: () => {
      return 'ReactNative'
    },
  })
  expect(isNodeProcess()).toBe(true)
  global.process = originalProcess
  global.navigator = originalNavigator
})
