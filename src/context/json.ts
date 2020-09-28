import { ResponseTransformer } from '../response'
import { mergeRight } from '../utils/internal/mergeRight'

type JSONContextOptions = {
  merge?: boolean
}

const defaultJSONContextOptions: JSONContextOptions = {
  merge: false,
}

/**
 * Sets the given value as the JSON body of the response.
 * @example
 * res(json({ key: 'value' }))
 * res(json('Some string'))
 * res(json([1, '2', false, { ok: true }]))
 */
export const json = <BodyType>(
  body: BodyType,
  {
    merge = defaultJSONContextOptions.merge,
  }: JSONContextOptions = defaultJSONContextOptions,
): ResponseTransformer<BodyType> => {
  return (res) => {
    res.headers.set('Content-Type', 'application/json')

    if (merge) {
      try {
        const nextBody = JSON.parse(res.body as string)
        res.body = JSON.stringify(mergeRight(body, nextBody)) as any
      } catch (e) {
        res.body = JSON.stringify(body) as any
      }
    } else {
      res.body = JSON.stringify(body) as any
    }
    return res
  }
}
