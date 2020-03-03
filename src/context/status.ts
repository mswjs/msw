import * as R from 'ramda'
import { ResponseTransformer } from '../response'

export const status = (
  statusCode: number,
  statusText?: string,
): ResponseTransformer => {
  return (res) => {
    res.status = statusCode

    if (statusText) {
      res.statusText = statusText
    }

    return res
  }
}
