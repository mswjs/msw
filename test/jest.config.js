module.exports = {
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
  },
  testTimeout: 10000,
  moduleNameMapper: {
    '^msw(.*)': '<rootDir>/..$1',
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
}
