import { jsonParse } from '../utils/internal/jsonParse'
import { mergeRight } from '../utils/internal/mergeRight'
import { json } from './json'
import { GraphQLPayloadContext } from '../typeUtils'

/**
 * Sets a given payload as a GraphQL response body.
 * @example
 * res(ctx.data({ user: { firstName: 'John' }}))
 * @see {@link https://mswjs.io/docs/api/context/data `ctx.data()`}
 */
export const data: GraphQLPayloadContext<Record<string, unknown>> = (
  payload,
) => {
  return (res) => {
    const prevBody = jsonParse(res.body) || {}
    const nextBody = mergeRight(prevBody, { data: payload })

    return json(nextBody)(res)
  }
}
