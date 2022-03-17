import { SetupWorkerInternalContext } from '../../glossary'
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

test('prints out a default start message into console', () => {
  const context = {
    registration: { scope: 'scopeValue' },
    worker: { scriptURL: 'scriptURLValue' },
  } as SetupWorkerInternalContext
  printStartMessage(context)

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

  // Includes service worker scope.
  expect(console.log).toHaveBeenCalledWith('Scope:', 'scopeValue')

  // Includes service worker script location.
  expect(console.log).toHaveBeenCalledWith(
    'Worker script location:',
    'scriptURLValue',
  )
})

test('supports printing a custom start message', () => {
  const context = {} as SetupWorkerInternalContext
  printStartMessage(context, { message: 'Custom start message' })

  expect(console.groupCollapsed).toHaveBeenCalledWith(
    '%c[MSW] Custom start message',
    expect.anything(),
  )
})

test('does not print any messages when log level is quiet', () => {
  const context = {} as SetupWorkerInternalContext
  printStartMessage(context, { quiet: true })

  expect(console.groupCollapsed).not.toHaveBeenCalled()
  expect(console.log).not.toHaveBeenCalled()
})
