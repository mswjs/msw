import { jsonParse } from '../utils/internal/jsonParse'
import { mergeRight } from '../utils/internal/mergeRight'
import { json } from './json'
import { GraphQLPayloadContext } from './types'

/**
 * Sets the GraphQL extensions on a given response.
 * @example
 * res(ctx.extensions({ tracing: { version: 1 }}))
 * @see {@link https://mswjs.io/docs/api/context/extensions `ctx.extensions()`}
 */
export const extensions: GraphQLPayloadContext<Record<string, unknown>> = (
  payload,
) => {
  return (res) => {
    const prevBody = jsonParse(res.body) || {}
    const nextBody = mergeRight(prevBody, { extensions: payload })
    return json(nextBody)(res)
  }
}
