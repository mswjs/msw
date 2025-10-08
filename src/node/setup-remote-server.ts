import type { RequestHandler } from '~/core/handlers/RequestHandler'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'
import type { SharedOptions } from '~/core/sharedOptions'

export function setupRemoteServer(
  ...handlers: Array<RequestHandler | WebSocketHandler>
) {
  return new SetupRemoteServerApi(handlers)
}

export interface SetupRemoteServer {
  listen: (options: SetupRemoteServerListenOptions) => Promise<void>
  close: () => Promise<void>
}

export interface SetupRemoteServerListenOptions extends SharedOptions {
  port: number
}

export class SetupRemoteServerApi implements SetupRemoteServer {
  constructor(readonly handlers: Array<RequestHandler | WebSocketHandler>) {}

  public async listen(options: SetupRemoteServerListenOptions) {
    //
  }

  public async close() {
    //
  }
}
