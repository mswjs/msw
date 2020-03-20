import statuses from 'statuses/codes.json'
import { ResponseTransformer } from '../response'

export const status = (
  statusCode: number,
  statusText?: string,
): ResponseTransformer => {
  return (res) => {
    res.status = statusCode
    res.statusText = statusText || statuses[statusCode]

    return res
  }
}
