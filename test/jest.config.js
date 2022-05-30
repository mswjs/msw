module.exports = {
  preset: 'ts-jest',
  testTimeout: 15000,
  moduleNameMapper: {
    '^msw(.*)': '<rootDir>/..$1',
  },
  setupFilesAfterEnv: ['./jest.setup.ts'],
}
