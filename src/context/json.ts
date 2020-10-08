import { ResponseTransformer } from '../response'
import { mergeRight } from '../utils/internal/mergeRight'

type JSONContextOptions = {
  merge?: boolean
}

/**
 * Sets the given value as the JSON body of the response.
 * @example
 * res(json({ key: 'value' }))
 * res(json('Some string'))
 * res(json([1, '2', false, { ok: true }]))
 */
export const json = <BodyTypeJSON, BodyTypeString extends string>(
  body: BodyTypeJSON,
  { merge = false }: JSONContextOptions = {},
): ResponseTransformer<BodyTypeString> => {
  return (res) => {
    res.headers.set('Content-Type', 'application/json')

    if (merge) {
      try {
        const nextBody = JSON.parse(res.body)

        res.body = JSON.stringify(mergeRight(body, nextBody)) as BodyTypeString
      } catch (e) {
        res.body = JSON.stringify(body) as BodyTypeString
      }
    } else {
      res.body = JSON.stringify(body) as BodyTypeString
    }

    return res
  }
}
