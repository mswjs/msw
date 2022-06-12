import { ResponseTransformer } from '../response'

/**
 * Sets a `ReadableStream` as the mocked response body.
 * @example
 * const stream = ctx.fetch('/resource').then(res => res.body)
 * return res(ctx.stream(stream))
 */
export function stream<BodyType>(
  readableStream: ReadableStream<BodyType>,
): ResponseTransformer<ReadableStream<BodyType>> {
  return (response) => {
    response.body = readableStream
    return response
  }
}
