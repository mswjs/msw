import { StartOptions, SetupWorkerInternalContext } from '../../glossary'

export const activateMocking = async (
  context: SetupWorkerInternalContext,
  options?: StartOptions,
  shared = false,
) => {
  const message = shared ? 'SHARED_MOCK_ACTIVATE' : 'MOCK_ACTIVATE'
  const event = shared ? 'SHARED_MOCKING_ENABLED' : 'MOCKING_ENABLED'
  context.worker?.postMessage(message)

  return context.events.once(event).then(() => {
    if (!options?.quiet) {
      console.groupCollapsed(
        `%c[MSW] ${shared ? 'Shared ' : ''}Mocking enabled.`,
        'color:orangered;font-weight:bold;',
      )
      if (shared) {
        console.log('All connected clients will be served these mocks')
      }
      console.log(
        '%cDocumentation: %chttps://mswjs.io/docs',
        'font-weight:bold',
        'font-weight:normal',
      )
      console.log('Found an issue? https://github.com/mswjs/msw/issues')
      console.groupEnd()
    }
  })
}
