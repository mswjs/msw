import { StartOptions, SetupWorkerInternalContext } from '../../glossary'

export const activateMocking = async (
  context: SetupWorkerInternalContext,
  options?: StartOptions,
) => {
  context.workerChannel.send('MOCK_ACTIVATE', { shared: options?.shared })

  return context.events.once('MOCKING_ENABLED').then(() => {
    if (!options?.quiet) {
      console.groupCollapsed(
        `%c[MSW] ${options?.shared ? 'Shared ' : ''}Mocking enabled.`,
        'color:orangered;font-weight:bold;',
      )
      if (options?.shared) {
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
