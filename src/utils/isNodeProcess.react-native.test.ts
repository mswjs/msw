// @ts-nocheck
/**
 * @jest-environment jsdom
 */
/**
 * Test in React Native Environment
 * Please see https://github.com/mswjs/msw/pull/255
 */

import { isNodeProcess } from './isNodeProcess'

// need to mock process and navigator in React Native and restore them
let originalNavigator
let originalProcess

beforeAll(() => {
  // back up
  originalNavigator = global.navigator
  originalProcess = global.process

  /**
   * because it runs in node, Object.proyotype.toString(global.process) will equal '[object process]',
   * we need to mock global.process and global.navigator. let them behave like in React Native
   * PLease see https://github.com/facebook/react-native/blob/master/Libraries/Core/setUpNavigator.js and
   * https://github.com/facebook/react-native/blob/master/Libraries/Core/setUpGlobals.js
   */
  global.process = {
    env: {
      NODE_ENV: 'development',
    },
  }
  Object.defineProperty(global.navigator, 'product', {
    get: () => {
      return 'ReactNative'
    },
  })
})

test('returns true when run in a react native environment', () => {
  expect(isNodeProcess()).toBe(true)
})

afterAll(() => {
  // restore them
  global.process = originalProcess
  global.navigator = originalNavigator
})
