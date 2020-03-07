module.exports = {
  testRegex: '(.+)\\.test\\.ts$',
  moduleNameMapper: {
    '^msw$': '<rootDir>/../lib/index.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
}
