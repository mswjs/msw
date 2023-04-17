/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  transform: {
    '^.+\\.ts$': '@swc/jest',
  },
  testEnvironment: 'node',
  testTimeout: 60_000,
}
