module.exports = {
  testRegex: '(.+)\\.test\\.ts$',
  testTimeout: 60000,
  moduleNameMapper: {
    '^msw(.*)': '<rootDir>/..$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
}
