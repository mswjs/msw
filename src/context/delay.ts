import { ResponseTransformer } from '../response'

/**
 * Delays the current response for the given duration (in ms)
 * @example
 * res(delay(1500), json({ foo: 'bar' }))
 */
export const delay = (durationMs: number): ResponseTransformer => {
  return (res) => {
    res.delay = durationMs
    return res
  }
}
