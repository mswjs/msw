import { getCallFrame } from './getCallFrame'

const mockStack = jest.fn()

beforeAll(() => {
  jest.spyOn(window, 'Error').mockImplementation(() => ({
    name: 'mockError',
    message: '',
    stack: mockStack(),
  }))
})

afterAll(() => {
  jest.restoreAllMocks()
})

test('Node on Linux and macOS error stack', () => {
  // version 1
  mockStack.mockImplementationOnce(() =>
    [
      'Error: ',
      '    at getCallFrame (/Users/mock/github/msw/lib/umd/index.js:3735:22)',
      '    at Object.get (/Users/mock/github/msw/lib/umd/index.js:3776:29)',
      '    at Object.<anonymous> (/Users/mock/github/msw/test/msw-api/setup-server/printHandlers.test.ts:13:8)', // <-- this one
      '    at Runtime._execModule (/Users/mock/github/msw/node_modules/jest-runtime/build/index.js:1299:24)',
      '    at Runtime._loadModule (/Users/mock/github/msw/node_modules/jest-runtime/build/index.js:898:12)',
      '    at Runtime.requireModule (/Users/mock/github/msw/node_modules/jest-runtime/build/index.js:746:10)',
      '    at jasmine2 (/Users/mock/github/msw/node_modules/jest-jasmine2/build/index.js:230:13)',
      '    at runTestInternal (/Users/mock/github/msw/node_modules/jest-runner/build/runTest.js:380:22)',
      '    at runTest (/Users/mock/github/msw/node_modules/jest-runner/build/runTest.js:472:34)',
    ].join('\n'),
  )

  expect(getCallFrame()).toBe(
    '/Users/mock/github/msw/test/msw-api/setup-server/printHandlers.test.ts:13:8',
  )

  // version 2
  mockStack.mockImplementationOnce(() =>
    [
      'Error: ',
      '    at getCallFrame (/Users/mock/git/msw/lib/umd/index.js:3735:22)',
      '    at graphQLRequestHandler (/Users/mock/git/msw/lib/umd/index.js:7071:25)',
      '    at Object.query (/Users/mock/git/msw/lib/umd/index.js:7182:18)',
      '    at Object.<anonymous> (/Users/mock/git/msw/test/msw-api/setup-server/printHandlers.test.ts:14:11)', // <-- this one
      '    at Runtime._execModule (/Users/mock/git/msw/node_modules/jest-runtime/build/index.js:1299:24)',
      '    at Runtime._loadModule (/Users/mock/git/msw/node_modules/jest-runtime/build/index.js:898:12)',
      '    at Runtime.requireModule (/Users/mock/git/msw/node_modules/jest-runtime/build/index.js:746:10)',
      '    at jasmine2 (/Users/mock/git/msw/node_modules/jest-jasmine2/build/index.js:230:13)',
      '    at runTestInternal (/Users/mock/git/msw/node_modules/jest-runner/build/runTest.js:380:22)',
      '    at runTest (/Users/mock/git/msw/node_modules/jest-runner/build/runTest.js:472:34)',
    ].join('\n'),
  )

  expect(getCallFrame()).toBe(
    '/Users/mock/git/msw/test/msw-api/setup-server/printHandlers.test.ts:14:11',
  )
})

test('Node on Windows error stack', () => {
  mockStack.mockImplementationOnce(() =>
    [
      'Error: ',
      '    at getCallFrame (C:\\Users\\mock\\git\\msw\\lib\\umd\\index.js:3735:22)',
      '    at graphQLRequestHandler (C:\\Users\\mock\\git\\msw\\lib\\umd\\index.js:7071:25)',
      '    at Object.query (C:\\Users\\mock\\git\\msw\\lib\\umd\\index.js:7182:18)',
      '    at Object.<anonymous> (C:\\Users\\mock\\git\\msw\\test\\msw-api\\setup-server\\printHandlers.test.ts:75:13)', // <-- this one
      '    at Object.asyncJestTest (C:\\Users\\mock\\git\\msw\\node_modules\\jest-jasmine2\\build\\jasmineAsyncInstall.js:106:37)',
      '    at C:\\Users\\mock\\git\\msw\\node_modules\\jest-jasmine2\\build\\queueRunner.js:45:12',
      '    at new Promise (<anonymous>)',
      '    at mapper (C:\\Users\\mock\\git\\msw\\node_modules\\jest-jasmine2\\build\\queueRunner.js:28:19)',
      '    at C:\\Users\\mock\\git\\msw\\node_modules\\jest-jasmine2\\build\\queueRunner.js:75:41',
    ].join('\n'),
  )

  expect(getCallFrame()).toBe(
    'C:\\Users\\mock\\git\\msw\\test\\msw-api\\setup-server\\printHandlers.test.ts:75:13',
  )
})

test('Chrome and Edge error stack', () => {
  mockStack.mockImplementationOnce(() =>
    [
      'Error',
      '    at getCallFrame (webpack:///./lib/esm/getCallFrame-deps.js?:272:20)',
      '    at Object.eval [as get] (webpack:///./lib/esm/rest-deps.js?:1402:90)',
      '    at eval (webpack:///./test/msw-api/setup-worker/printHandlers.mocks.ts?:6:113)', // <-- this one
      '    at Module../test/msw-api/setup-worker/printHandlers.mocks.ts (http://localhost:59464/main.js:1376:1)',
      '    at __webpack_require__ (http://localhost:59464/main.js:790:30)',
      '    at fn (http://localhost:59464/main.js:101:20)',
      '    at eval (webpack:///multi_(webpack)-dev-server/client?:4:18)',
      '    at Object.0 (http://localhost:59464/main.js:1399:1)',
      '    at __webpack_require__ (http://localhost:59464/main.js:790:30)',
      '    at http://localhost:59464/main.js:857:37',
    ].join('\n'),
  )

  expect(getCallFrame()).toBe(
    'webpack:///./test/msw-api/setup-worker/printHandlers.mocks.ts?:6:113',
  )
})

test('Firefox on macOS and Windows error stack', () => {
  mockStack.mockImplementationOnce(() =>
    [
      'getCallFrame@webpack:///./lib/esm/getCallFrame-deps.js?:272:20',
      'createRestHandler/<@webpack:///./lib/esm/rest-deps.js?:1402:90',
      '@webpack:///./test/msw-api/setup-worker/printHandlers.mocks.ts?:6:113', // <-- this one
      './test/msw-api/setup-worker/printHandlers.mocks.ts@http://localhost:59464/main.js:1376:1',
      '__webpack_require__@http://localhost:59464/main.js:790:30',
      'fn@http://localhost:59464/main.js:101:20',
      '@webpack:///multi_(webpack)-dev-server/client?:4:18',
      '0@http://localhost:59464/main.js:1399:1',
      '__webpack_require__@http://localhost:59464/main.js:790:30',
      '@http://localhost:59464/main.js:857:37',
    ].join('\n'),
  )

  expect(getCallFrame()).toBe(
    'webpack:///./test/msw-api/setup-worker/printHandlers.mocks.ts?:6:113',
  )
})

test('Safari on macOS error stack', () => {
  // version 1
  mockStack.mockImplementationOnce(() =>
    [
      'getCallFrame',
      '',
      'eval code',
      'eval@[native code]',
      './test/msw-api/setup-worker/printHandlers.mocks.ts@http://localhost:59464/main.js:1376:5', // <-- this one
      '__webpack_require__@http://localhost:59464/main.js:790:34',
      'fn@http://localhost:59464/main.js:101:39',
      'eval code',
      'eval@[native code]',
      'http://localhost:59464/main.js:1399:5',
      '__webpack_require__@http://localhost:59464/main.js:790:34',
      'http://localhost:59464/main.js:857:37',
      'global code@http://localhost:59464/main.js:858:12',
    ].join('\n'),
  )

  expect(getCallFrame()).toBe(
    './test/msw-api/setup-worker/printHandlers.mocks.ts@http://localhost:59464/main.js:1376:5',
  )

  // version 2
  mockStack.mockImplementationOnce(() =>
    [
      'getCallFrame',
      'graphQLRequestHandler',
      'eval code',
      'eval@[native code]',
      './test/msw-api/setup-worker/printHandlers.mocks.ts@http://localhost:56460/main.js:1376:5', // <-- this one
      '__webpack_require__@http://localhost:56460/main.js:790:34',
      'fn@http://localhost:56460/main.js:101:39',
      'eval code',
      'eval@[native code]',
      'http://localhost:56460/main.js:1399:5',
      '__webpack_require__@http://localhost:56460/main.js:790:34',
      'http://localhost:56460/main.js:857:37',
      'global code@http://localhost:56460/main.js:858:12',
    ].join('\n'),
  )

  expect(getCallFrame()).toBe(
    './test/msw-api/setup-worker/printHandlers.mocks.ts@http://localhost:56460/main.js:1376:5',
  )
})

test('Handles the undefined stack trace', () => {
  mockStack.mockImplementationOnce(() => undefined)
  expect(() => getCallFrame()).not.toThrow(TypeError)

  mockStack.mockImplementationOnce(() => null)
  expect(() => getCallFrame()).not.toThrow(TypeError)
})
