module.exports = {
  bail: true,
  roots: ['<rootDir>/src', '<rootDir>/cli'],
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(j|t)sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFiles: ['./jest.setup.js'],
}
