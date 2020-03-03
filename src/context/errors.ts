import { GraphQLError } from 'graphql'
import { ResponseTransformer } from '../response'
import { json } from './json'

export const errors = (
  errorsList: Partial<GraphQLError>[],
): ResponseTransformer => {
  return json({ errors: errorsList })
}
