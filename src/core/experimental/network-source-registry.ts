import type { HandlerKind } from '../handlers/Handler'
import type { NetworkSource } from './sources/network-source'

interface SourceState {
  source: NetworkSource
  enabled: boolean
  owners: Set<NetworkSourceRegistry>
  pending: Promise<void> | undefined
  errors: Array<unknown>
}

/**
 * Reconciles a fixed set of sources with the current handler kinds.
 * Transitions are synchronous when possible and serialized per source.
 */
export class NetworkSourceRegistry {
  // A source has one lifecycle even when consecutive or concurrent registries
  // refer to it. Each registry owns only its demand for that source.
  static readonly #states = new WeakMap<NetworkSource, SourceState>()
  readonly #sources: Array<SourceState>

  constructor(sources: ReadonlyArray<NetworkSource>) {
    this.#sources = [...new Set(sources)].map((source) => {
      const existing = NetworkSourceRegistry.#states.get(source)

      if (existing) {
        return existing
      }

      const state: SourceState = {
        source,
        enabled: false,
        owners: new Set(),
        pending: undefined,
        errors: [],
      }
      NetworkSourceRegistry.#states.set(source, state)

      return state
    })
  }

  /**
   * A Promise that settles when all the network sources in the registry
   * are in the idle state (i.e. not in the process of being enabled/disabled).
   */
  public get idle(): Promise<void> {
    return this.#waitUntilIdle()
  }

  /**
   * Accept the given list of request handler kinds and enable/disable
   * the network sources to correspond to those handlers.
   */
  public accept(
    handlerKinds: ReadonlyArray<HandlerKind>,
  ): void | Promise<void> {
    return this.#reconcile((source) => {
      return (
        !source.lazy.enabled ||
        source.lazy.handlers.some((kind) => {
          return handlerKinds.includes(kind)
        })
      )
    })
  }

  public dispose(): void | Promise<void> {
    return this.#reconcile(() => {
      return false
    })
  }

  #reconcile(
    isRequired: (source: NetworkSource) => boolean,
  ): void | Promise<void> {
    for (const state of this.#sources) {
      if (isRequired(state.source)) {
        state.owners.add(this)
      } else {
        state.owners.delete(this)
      }
      state.errors = []
    }

    for (const state of this.#sources) {
      NetworkSourceRegistry.#transition(state)
    }

    if (
      this.#sources.some((state) => {
        return state.pending !== undefined || state.errors.length > 0
      })
    ) {
      const idle = this.idle
      // Runtime handler updates are synchronous; retain errors for idle readers
      // without producing an unhandled rejection when the return is ignored.
      void idle.catch(() => {})
      return idle
    }
  }

  static #transition(state: SourceState): void {
    const enabled = state.owners.size > 0

    if (state.pending || state.enabled === enabled) {
      return
    }

    const completion = Promise.withResolvers<void>()
    state.pending = completion.promise

    const complete = () => {
      state.pending = undefined
      state.enabled = enabled
      NetworkSourceRegistry.#transition(state)
      completion.resolve()
    }

    const fail = (error: unknown) => {
      state.pending = undefined
      state.errors.push(error)
      completion.resolve()
    }

    try {
      const result = enabled ? state.source.enable() : state.source.disable()

      if (result instanceof Promise) {
        void result.then(complete, fail)
        return
      }

      complete()
    } catch (error) {
      fail(error)
    }
  }

  async #waitUntilIdle(): Promise<void> {
    while (
      this.#sources.some((state) => {
        return state.pending !== undefined
      })
    ) {
      await Promise.all(
        this.#sources.map((state) => {
          return state.pending
        }),
      )
    }

    const errors = this.#sources.flatMap((state) => state.errors)

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Failed to update network sources')
    }
  }
}
