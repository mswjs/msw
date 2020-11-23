import { SharedOptions } from '../sharedOptions'
import { SetupApi } from '../setupWorker/glossary'

export interface SetupServerApi extends SetupApi {
  /**
   * Enables requests interception based on the previously provided mock definition.
   */
  listen: (options?: SharedOptions) => void

  /**
   * Stops requests interception by restoring all augmented modules.
   */
  close: () => void
}
