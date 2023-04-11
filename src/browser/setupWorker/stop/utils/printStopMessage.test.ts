import { printStopMessage } from './printStopMessage'

beforeAll(() => {
  jest.spyOn(global.console, 'log').mockImplementation()
})

afterEach(() => {
  jest.resetAllMocks()
})

afterAll(() => {
  jest.restoreAllMocks()
})

test('prints a stop message to the console', () => {
  printStopMessage()
  expect(console.log).toHaveBeenCalledWith(
    '%c[MSW] Mocking disabled.',
    'color:orangered;font-weight:bold;',
  )
})

test('does not print any message when log level is quiet', () => {
  printStopMessage({ quiet: true })
  expect(console.log).not.toHaveBeenCalled()
})
