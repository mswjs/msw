import type { SetupServerCommon } from '#core/experimental/setup-server-api'
export type {
  ListenOptions,
  SetupServerCommon,
} from '#core/experimental/setup-server-api'

export interface SetupServer extends SetupServerCommon {
  /**
   * Wraps the given function in a boundary. Any changes to the
   * network behavior (e.g. adding runtime request handlers via
   * `server.use()`) will be scoped to this boundary only.
   * @param callback A function to run (e.g. a test)
   *
   * @see {@link https://mswjs.io/docs/api/setup-server/boundary `server.boundary()` API reference}
   */
  boundary: <Args extends Array<any>, R>(
    callback: (...args: Args) => R,
  ) => (...args: Args) => R
}
