/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  rootDir: './node',
  // Limit the concurrency because some tests recompile the library,
  // creating a moment of time when it has no "lib" files.
  maxWorkers: 1,
  moduleNameMapper: {
    '^msw(.*)': '<rootDir>/../..$1',
  },
}
