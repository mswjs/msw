import { isNodeProcess } from 'is-node-process'
import { ResponseTransformer } from '../response'

export const SET_TIMEOUT_MAX_ALLOWED_INT = 2147483647
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

export type DelayMode = 'real' | 'infinite'

/**
 * Delays the response by the given duration (ms).
 * @example
 * res(ctx.delay(1200)) // delay response by 1200ms
 * res(ctx.delay()) // emulate realistic server response time
 * res(ctx.delay('infinite')) // delay response infinitely
 * @see {@link https://mswjs.io/docs/api/context/delay `ctx.delay()`}
 */
export const delay = (
  durationOrMode?: DelayMode | number,
): ResponseTransformer => {
  return (res) => {
    let delayTime: number

    if (typeof durationOrMode === 'string') {
      switch (durationOrMode) {
        case 'infinite': {
          // Using `Infinity` as a delay value executes the response timeout immediately.
          // Instead, use the maximum allowed integer for `setTimeout`.
          delayTime = SET_TIMEOUT_MAX_ALLOWED_INT
          break
        }
        case 'real': {
          delayTime = getRandomServerResponseTime()
          break
        }
        default: {
          throw new Error(
            `Failed to delay a response: unknown delay mode "${durationOrMode}". Please make sure you provide one of the supported modes ("real", "infinite") or a number to "ctx.delay".`,
          )
        }
      }
    } else if (typeof durationOrMode === 'undefined') {
      // Use random realistic server response time when no explicit delay duration was provided.
      delayTime = getRandomServerResponseTime()
    } else {
      // Guard against passing values like `Infinity` or `Number.MAX_VALUE`
      // as the response delay duration. They don't produce the result you may expect.
      if (durationOrMode > SET_TIMEOUT_MAX_ALLOWED_INT) {
        throw new Error(
          `Failed to delay a response: provided delay duration (${durationOrMode}) exceeds the maximum allowed duration for "setTimeout" (${SET_TIMEOUT_MAX_ALLOWED_INT}). This will cause the response to be returned immediately. Please use a number within the allowed range to delay the response by exact duration, or consider the "infinite" delay mode to delay the response indefinitely.`,
        )
      }

      delayTime = durationOrMode
    }

    res.delay = delayTime
    return res
  }
}
