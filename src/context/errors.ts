import { GraphQLError } from 'graphql'
import { ResponseTransformer } from '../response'
import { json } from './json'

/**
 * Sets a given list of GraphQL errors on the mocked response.
 */
export const errors = <
  ErrorsType extends Partial<GraphQLError>[] | null | undefined
>(
  errorsList: ErrorsType,
): ResponseTransformer<{ errors: ErrorsType }> => {
  if (errorsList == null) {
    return (res) => res
  }

  return json({ errors: errorsList }, { merge: true })
}
