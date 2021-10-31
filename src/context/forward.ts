import { ResponseTransformer } from '../response'

/**
 * Explicitly perform the request as-is
 * @example
 * @see {@link https://mswjs.io/docs/api/context/forward `ctx.forward()`}
 */
export const forward = (): ResponseTransformer => {
  return (res) => {
    res.forward = true
    return res
  }
}
