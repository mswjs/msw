/** @type {import('jest').Config} */
module.exports = {
  rootDir: './node',
  transform: {
    '^.+\\.ts$': '@swc/jest',
  },
  // Limit the concurrency because some tests recompile the library,
  // creating a moment of time when it has no "lib" files.
  maxWorkers: 1,
  moduleNameMapper: {
    '^msw(.*)': '<rootDir>/../..$1',
  },
  testEnvironmentOptions: {
    // Force JSDOM to use the Node module resolution because we're still in Node.js.
    // Using browser resolution won't work by design because JSDOM is not a browser
    // and doesn't ship with 100% compatibility with the browser APIs.
    // In tests, using browser resolution will result in "ClientRequest" imports
    // from "@mswjs/interceptors" to not be found because they are not exported
    // by the browser bundle of that library.
    customExportConditions: [''],
  },
  globals: {
    Request,
    Response,
  },
}
