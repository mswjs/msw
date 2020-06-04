import { ResponseTransformer } from '../response'

export const MIN_SERVER_RESPONSE_TIME = 100
export const MAX_SERVER_RESPONSE_TIME = 400

const getRandomServerResponseTime = () =>
  Math.floor(
    Math.random() * (MAX_SERVER_RESPONSE_TIME - MIN_SERVER_RESPONSE_TIME) +
      MIN_SERVER_RESPONSE_TIME,
  )

/**
 * Delays the current response for the given duration (in ms)
 * @example
 * res(delay(1500), json({ foo: 'bar' }))
 */
export const delay = (durationMs?: number): ResponseTransformer => {
  return (res) => {
    res.delay = durationMs ?? getRandomServerResponseTime()
    return res
  }
}
