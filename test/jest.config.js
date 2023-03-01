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
    customExportConditions: [''],
  },
  globals: {
    Request,
    Response,
  },
}
