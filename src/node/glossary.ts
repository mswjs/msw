import { SharedOptions } from '../sharedOptions'
import { RequestHandlersList } from '../setupWorker/glossary'

export type ListenOptions = SharedOptions

export interface ServerInstance {
  listen: (options?: ListenOptions) => void
  use: (...handlers: RequestHandlersList) => void
  restoreHandlers: () => void
  resetHandlers: (...nextHandlers: RequestHandlersList) => void
  close: () => void
}
