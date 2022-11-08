module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  testTimeout: 15000,
  moduleNameMapper: {
    '^msw(.*)': '<rootDir>/..$1',
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
}
