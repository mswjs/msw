import statuses from 'statuses/codes.json'
import { ResponseTransformer } from '../response'

/**
 * Sets a response status code and text.
 * @example
 * res(ctx.status(301))
 * res(ctx.status(400, 'Custom status text'))
 * @see {@link https://mswjs.io/docs/api/context/status `ctx.status()`}
 */
export const status = (
  statusCode: number,
  statusText?: string,
): ResponseTransformer => {
  return (res) => {
    res.status = statusCode
    res.statusText =
      statusText || statuses[String(statusCode) as keyof typeof statuses]

    return res
  }
}
