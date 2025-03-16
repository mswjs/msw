import { devUtils } from '~/core/utils/internal/devUtils'
import type { SetupWorkerInternalContext } from '../setupWorker/glossary'

/**
 * Check whether the registered Service Worker has been
 * generated by the installed version of the library.
 * Prints a warning message if the worker scripts mismatch.
 */
export async function checkWorkerIntegrity(
  context: SetupWorkerInternalContext,
): Promise<void> {
  // Request the integrity checksum from the registered worker.
  context.workerChannel.send('INTEGRITY_CHECK_REQUEST')

  const { payload } = await context.events.once('INTEGRITY_CHECK_RESPONSE')

  // Compare the response from the Service Worker and the
  // global variable set during the build.

  // The integrity is validated based on the worker script's checksum
  // that's derived from its minified content during the build.
  // The "SERVICE_WORKER_CHECKSUM" global variable is injected by the build.
  if (payload.checksum !== SERVICE_WORKER_CHECKSUM) {
    devUtils.warn(
      `The currently registered Service Worker has been generated by a different version of MSW (${payload.packageVersion}) and may not be fully compatible with the installed version.

It's recommended you update your worker script by running this command:

  \u2022 npx msw init <PUBLIC_DIR>

You can also automate this process and make the worker script update automatically upon the library installations. Read more: https://mswjs.io/docs/cli/init.`,
    )
  }
}
