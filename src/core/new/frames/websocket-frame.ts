import { BaseNetworkFrame } from './base-frame'

export abstract class WebSocketFrame extends BaseNetworkFrame<'ws', {}, {}> {}
