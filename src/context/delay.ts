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
 * Delays the current response for the given duration (in ms)
 * @example
 * res(delay()) // realistic server response time
 * res(delay(1500)) // explicit response delay duration
 */
export const delay = (durationMs?: number): ResponseTransformer => {
  return (res) => {
    res.delay = durationMs ?? getRandomServerResponseTime()
    return res
  }
}
