import { NetworkSource } from '.'

export class RemoteProcessNetworkSource implements NetworkSource {
  constructor(private readonly options: { port: number }) {}
}
