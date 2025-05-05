import type { HandlerKind } from './common'
import { RequestHandler } from './RequestHandler'
import { WebSocketHandler } from './WebSocketHandler'
import { isHandlerKind } from '../utils/internal/isHandlerKind'

export class BatchHandler {
  constructor(
    public readonly entries: Array<RequestHandler | WebSocketHandler>,
  ) {}

  public unwrapHandlers<Kind extends HandlerKind>(
    kind: Kind,
  ): Array<
    Kind extends 'RequestHandler'
      ? RequestHandler
      : Kind extends 'EventHandler'
        ? WebSocketHandler
        : never
  > {
    return this.entries.filter<any>(isHandlerKind(kind))
  }
}
