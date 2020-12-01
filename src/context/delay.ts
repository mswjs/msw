import { ResponseTransformer } from '../response'
import { isNodeProcess } from '../utils/internal/isNodeProcess'

export const MIN_SERVER_RESPONSE_TIME = 100
export const MAX_SERVER_RESPONSE_TIME = 400
export const NODE_SERVER_RESPONSE_TIME = 5

const getRandomServerResponseTime = () => {
  if (isNodeProcess()) {
    return NODE_SERVER_RESPONSE_TIME
  }

  return Math.floor(
    Math.random() * (MAX_SERVER_RESPONSE_TIME - MIN_SERVER_RESPONSE_TIME) +
      MIN_SERVER_RESPONSE_TIME,
  )
}

/**
 * Delays the response by the given duration (ms).
 * @example
 * res(ctx.delay()) // realistic server response time
 * res(ctx.delay(1200))
 * @see {@link https://mswjs.io/docs/api/context/delay `ctx.delay()`}
 */
export const delay = (durationMs?: number): ResponseTransformer => {
  return (res) => {
    res.delay = durationMs ?? getRandomServerResponseTime()
    return res
  }
}
