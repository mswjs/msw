import { StartOptions, SetupWorkerInternalContext } from '../../glossary'

export const activateMocking = async (
  context: SetupWorkerInternalContext,
  options?: StartOptions,
) => {
  context.worker?.postMessage('MOCK_ACTIVATE')

  return context.events.once('MOCKING_ENABLED').then(() => {
    if (!options?.quiet) {
      console.groupCollapsed(
        '%c[MSW] Mocking enabled.',
        'color:orangered;font-weight:bold;',
      )
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
