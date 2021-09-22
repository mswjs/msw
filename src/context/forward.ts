import { ResponseTransformer } from '..'
import { defaultResponse } from '../response'

export const forward = (): ResponseTransformer => (res) => {
  return { ...res, ...defaultResponse }
}
