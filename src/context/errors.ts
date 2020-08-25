import { GraphQLError } from 'graphql'
import { ResponseTransformer } from '../response'
import { json } from './json'

/**
 * Returns a list of GraphQL errors.
 */
export const errors = (
  errorsList: Partial<GraphQLError>[],
): ResponseTransformer<{ errors: typeof errorsList }> => {
  return json({ errors: errorsList })
}
