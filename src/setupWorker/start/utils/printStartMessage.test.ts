import { printStartMessage } from './printStartMessage'

beforeAll(() => {
  jest.spyOn(global.console, 'groupCollapsed').mockImplementation()
  jest.spyOn(global.console, 'log').mockImplementation()
})

afterEach(() => {
  jest.resetAllMocks()
})

afterAll(() => {
  jest.restoreAllMocks()
})

test('prints out a mocking activation message into console', () => {
  printStartMessage()

  expect(console.groupCollapsed).toHaveBeenCalledWith(
    '%c[MSW] Mocking enabled.',
    expect.anything(),
  )

  // Includes a link to the documentation.
  expect(console.log).toHaveBeenCalledWith(
    '%cDocumentation: %chttps://mswjs.io/docs',
    expect.anything(),
    expect.anything(),
  )

  // Includes a link to the GitHub issues page.
  expect(console.log).toHaveBeenCalledWith(
    'Found an issue? https://github.com/mswjs/msw/issues',
  )
})

test('does not print any messages ', () => {
  printStartMessage(true)

  expect(console.groupCollapsed).not.toHaveBeenCalled()
  expect(console.log).not.toHaveBeenCalled()
})
