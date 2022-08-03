import type { GraphQLError } from 'graphql'
import { ResponseTransformer } from '../response'
import { jsonParse } from '../utils/internal/jsonParse'
import { mergeRight } from '../utils/internal/mergeRight'
import { json } from './json'

/**
 * Sets a given list of GraphQL errors on the mocked response.
 * @example res(ctx.errors([{ message: 'Unauthorized' }]))
 * @see {@link https://mswjs.io/docs/api/context/errors}
 */
export const errors = <
  ErrorsType extends readonly Partial<GraphQLError>[] | null | undefined,
>(
  errorsList: ErrorsType,
): ResponseTransformer<string> => {
  return (res) => {
    if (errorsList == null) {
      return res
    }

    const prevBody = jsonParse(res.body) || {}
    const nextBody = mergeRight(prevBody, { errors: errorsList })

    return json(nextBody)(res as any) as any
  }
}
