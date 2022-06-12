const ParentClass =
  typeof BroadcastChannel == 'undefined'
    ? class UnsupportedEnvironment {
        constructor() {
          throw new Error(
            'Cannot construct BroadcastChannel in a non-browser environment',
          )
        }
      }
    : BroadcastChannel

export class StrictBroadcastChannel<
  MessageMap extends Record<string, any>,
> extends (ParentClass as unknown as { new (name: string): BroadcastChannel }) {
  public postMessage<MessageType extends keyof MessageMap>(
    message: Parameters<MessageMap[MessageType]>[0] extends undefined
      ? {
          type: MessageType
        }
      : {
          type: MessageType
          payload: Parameters<MessageMap[MessageType]>[0]
        },
  ): void {
    return super.postMessage(message)
  }
}
