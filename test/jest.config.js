module.exports = {
  testRegex: '(.+)\\.test\\.ts$',
  // Increase the test timeout to allow webpack build
  // and Puppeteer bootstrapping to take place.
  testTimeout: 999999,
  moduleNameMapper: {
    '^msw$': '<rootDir>/../lib/index.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
}
