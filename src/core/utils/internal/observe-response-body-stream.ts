import { DeferredPromise } from '@open-draft/deferred-promise'
import { FetchResponse } from '@mswjs/interceptors'
import { copyResponseDecorations } from '../HttpResponse/decorators'

export interface ObservedResponse {
  response: Response
  /**
   * A promise that resolves once the response body stream has settled:
   * it was closed, errored, or canceled, and will not be used anymore.
   */
  settled: Promise<void>
}

/**
 * The `cancel` transformer callback is missing from the TypeScript
 * DOM types. It is invoked when the readable side of the transform
 * stream is canceled by the consumer or its writable side is aborted
 * (e.g. when the source stream errors).
 * @see https://streams.spec.whatwg.org/#transformer-api
 */
interface TransformerWithCancel<Input, Output> extends Transformer<
  Input,
  Output
> {
  cancel?: (reason: unknown) => void | PromiseLike<void>
}

/**
 * Observe the `ReadableStream` body of the given response.
 * Returns a copy of that response whose body reports when it has
 * settled (was read to completion, errored, or canceled by the consumer).
 * Returns `null` for responses whose body cannot be observed
 * (no body, already used, or locked).
 */
export function observeResponseBodyStream(
  response: Response,
): ObservedResponse | null {
  if (response.body == null || response.bodyUsed || response.body.locked) {
    return null
  }

  const settled = new DeferredPromise<void>()
  const settle = (): void => {
    settled.resolve()
  }

  /**
   * @note Reconstruct the response because the body of an existing
   * response cannot be replaced. Use `FetchResponse` to support
   * non-standard response status codes (e.g. 101).
   */
  const observedResponse = new FetchResponse(
    response.body.pipeThrough(
      new TransformStream({
        flush: settle,
        cancel: settle,
      } as TransformerWithCancel<Uint8Array, Uint8Array>),
    ),
    {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    },
  )

  copyResponseDecorations(response, observedResponse)

  return {
    response: observedResponse,
    settled,
  }
}
