import { DeferredPromise } from '@open-draft/deferred-promise'
import { FetchResponse } from '@mswjs/interceptors'
import { copyResponseOwnProperties } from '../HttpResponse/decorators'

export interface ObservedResponse {
  response: Response
  /**
   * A promise that resolves once the response body stream has settled:
   * it was closed, errored, or canceled, and will not be used anymore.
   */
  settled: Promise<void>
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
  const reader = response.body.getReader()

  /**
   * @note Relay the body through a manual underlying source instead of
   * `.pipeThrough(new TransformStream({ flush, cancel }))`. The `cancel`
   * transformer callback is not implemented in Chromium, which loses
   * the stream error/cancelation signals there entirely.
   */
  const observedStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const readResult = await reader.read()

        if (readResult.done) {
          settled.resolve()
          controller.close()
          return
        }

        controller.enqueue(readResult.value)
      } catch (error) {
        settled.resolve()
        throw error
      }
    },
    async cancel(reason) {
      settled.resolve()
      await reader.cancel(reason)
    },
  })

  /**
   * @note Reconstruct the response because the body of an existing
   * response cannot be replaced. Use `FetchResponse` to support
   * non-standard response status codes (e.g. 101).
   */
  const observedResponse = new FetchResponse(observedStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })

  copyResponseOwnProperties(response, observedResponse)

  return {
    response: observedResponse,
    settled,
  }
}
