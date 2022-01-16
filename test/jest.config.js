module.exports = {
  preset: 'ts-jest',
  testTimeout: 60000,
  moduleNameMapper: {
    '^msw(.*)': '<rootDir>/..$1',
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
}
