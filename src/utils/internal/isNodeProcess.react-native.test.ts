/**
 * @jest-environment node
 *
 * This test suite asserts `isNodeProcess` behavior in the React Native environment.
 * Its setup hooks emulate the aforementioned environment as much as it's possible.
 */
import { isNodeProcess } from './isNodeProcess'

// Provide TypeScript overrides to operate with the `global` namespace
declare global {
  namespace NodeJS {
    interface Global {
      navigator: {
        product: string
      }
    }
  }
}

// need to mock process and navigator in React Native and restore them
let originalProcess: typeof global['process']
let originalNavigator: typeof global['navigator']

beforeAll(() => {
  // Store the original `global` properties.
  originalProcess = global.process
  originalNavigator = global.navigator

  /**
   * React Native has a unique property to determine that the process
   * is running in a React Native environment.
   * @see https://github.com/facebook/react-native/issues/1331
   * @see https://github.com/facebook/react-native/blob/6d6c68c2c639b6473e049f7d916690b92e921c7e/Libraries/Core/setUpNavigator.js
   * @see https://github.com/facebook/react-native/blob/6d6c68c2c639b6473e049f7d916690b92e921c7e/Libraries/Core/setUpGlobals.js
   */
  global.process = {
    env: {
      NODE_ENV: 'development',
    },
  } as any

  global.navigator = {
    product: 'ReactNative',
  } as any
})

afterAll(() => {
  // Restore the stubbed `global` properties.
  global.process = originalProcess
  global.navigator = originalNavigator
})

test('treats React Native as a Node.js environment', () => {
  expect(isNodeProcess()).toBe(true)
})
